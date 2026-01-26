import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const providerRouter = router({
  // Listar todos os prestadores
  list: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      orderBy: { name: "asc" },
      include: {
        area: true,
        position: true,
        hierarchyLevel: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      salary: provider.salary.toNumber(),
      startDate: provider.startDate,
      seniority: provider.seniority,
      ndaStatus: provider.ndaStatus,
      contractStatus: provider.contractStatus,
      isActive: provider.isActive,
      area: {
        id: provider.area.id,
        name: provider.area.name,
      },
      position: {
        id: provider.position.id,
        name: provider.position.name,
      },
      hierarchyLevel: provider.hierarchyLevel,
      user: provider.user,
      createdAt: provider.createdAt,
    }));
  }),

  // Listar prestadores ativos sem usuario vinculado (para vincular a novos usuarios)
  listUnlinked: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      where: {
        isActive: true,
        userId: null,
      },
      orderBy: { name: "asc" },
      include: {
        area: true,
        position: true,
      },
    });

    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      area: {
        id: provider.area.id,
        name: provider.area.name,
      },
      position: {
        id: provider.position.id,
        name: provider.position.name,
      },
    }));
  }),

  // Listar prestadores disponiveis para vincular a um usuario (inclui o ja vinculado)
  listAvailableForUser: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const providers = await prisma.provider.findMany({
        where: {
          isActive: true,
          OR: [
            { userId: null },
            { userId: input.userId },
          ],
        },
        orderBy: { name: "asc" },
        include: {
          area: true,
          position: true,
        },
      });

      return providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        isLinkedToThisUser: provider.userId === input.userId,
        area: {
          id: provider.area.id,
          name: provider.area.name,
        },
        position: {
          id: provider.position.id,
          name: provider.position.name,
        },
      }));
    }),

  // Listar apenas prestadores ativos
  listActive: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        area: true,
        position: true,
      },
    });

    return providers.map((provider) => ({
      id: provider.id,
      name: provider.name,
      salary: provider.salary.toNumber(),
      seniority: provider.seniority,
      area: {
        id: provider.area.id,
        name: provider.area.name,
      },
      position: {
        id: provider.position.id,
        name: provider.position.name,
      },
    }));
  }),

  // Obter prestador por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const provider = await prisma.provider.findUnique({
        where: { id: input.id },
        include: {
          area: true,
          position: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!provider) {
        return null;
      }

      return {
        id: provider.id,
        name: provider.name,
        salary: provider.salary.toNumber(),
        startDate: provider.startDate,
        seniority: provider.seniority,
        ndaStatus: provider.ndaStatus,
        contractStatus: provider.contractStatus,
        isActive: provider.isActive,
        area: {
          id: provider.area.id,
          name: provider.area.name,
        },
        position: {
          id: provider.position.id,
          name: provider.position.name,
        },
        user: provider.user,
        createdAt: provider.createdAt,
      };
    }),

  // Criar prestador (apenas admin)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        salary: z.number().positive(),
        startDate: z.string().or(z.date()),
        birthDate: z.string().or(z.date()).optional().nullable(),
        seniority: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "NA"]).default("NA"),
        ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
        contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
        areaId: z.string(),
        positionId: z.string(),
        hierarchyLevelId: z.string().optional(),
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Se vincular a um usuario, verificar se ja nao tem prestador
      let linkedUser = null;
      if (input.userId) {
        const existingProvider = await prisma.provider.findUnique({
          where: { userId: input.userId },
        });
        if (existingProvider) {
          throw new Error("Usuario ja possui prestador vinculado");
        }
        // Buscar usuario para obter hierarchyLevelId se nao foi informado
        linkedUser = await prisma.user.findUnique({
          where: { id: input.userId },
        });
      }

      // Se nao informou hierarchyLevelId mas vinculou usuario, usar o do usuario
      const hierarchyLevelId = input.hierarchyLevelId || linkedUser?.hierarchyLevelId || undefined;

      const provider = await prisma.provider.create({
        data: {
          name: input.name,
          salary: input.salary,
          startDate: new Date(input.startDate),
          birthDate: input.birthDate ? new Date(input.birthDate) : null,
          seniority: input.seniority,
          ndaStatus: input.ndaStatus,
          contractStatus: input.contractStatus,
          areaId: input.areaId,
          positionId: input.positionId,
          hierarchyLevelId,
          userId: input.userId,
        },
      });

      // Se vinculou a um usuario, sincronizar area, cargo e nivel do usuario
      if (input.userId) {
        await prisma.user.update({
          where: { id: input.userId },
          data: {
            areaId: input.areaId,
            positionId: input.positionId,
            hierarchyLevelId,
          },
        });
      }

      return provider;
    }),

  // Atualizar prestador (apenas admin)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(2).optional(),
        salary: z.number().positive().optional(),
        startDate: z.string().or(z.date()).optional(),
        birthDate: z.string().or(z.date()).nullable().optional(),
        seniority: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "NA"]).optional(),
        ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
        contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
        isActive: z.boolean().optional(),
        areaId: z.string().optional(),
        positionId: z.string().optional(),
        hierarchyLevelId: z.string().nullable().optional(),
        userId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Buscar prestador atual para saber o usuario vinculado
      const existingProvider = await prisma.provider.findUnique({
        where: { id: input.id },
      });

      if (!existingProvider) {
        throw new Error("Prestador nao encontrado");
      }

      const { id, startDate, birthDate, ...rest } = input;

      const data: Record<string, unknown> = { ...rest };
      if (startDate) {
        data.startDate = new Date(startDate);
      }
      if (birthDate !== undefined) {
        data.birthDate = birthDate ? new Date(birthDate) : null;
      }

      const provider = await prisma.provider.update({
        where: { id },
        data,
      });

      // Sincronizar area/cargo/nivel com usuario vinculado (se houver)
      const linkedUserId = input.userId !== undefined ? input.userId : existingProvider.userId;
      if (linkedUserId) {
        const syncData: { areaId?: string; positionId?: string; hierarchyLevelId?: string | null } = {};
        if (input.areaId) syncData.areaId = input.areaId;
        if (input.positionId) syncData.positionId = input.positionId;
        if (input.hierarchyLevelId !== undefined) syncData.hierarchyLevelId = input.hierarchyLevelId;

        if (Object.keys(syncData).length > 0) {
          await prisma.user.update({
            where: { id: linkedUserId },
            data: syncData,
          });
        }
      }

      return provider;
    }),

  // Deletar prestador (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      await prisma.provider.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Desativar prestador (soft delete)
  deactivate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const provider = await prisma.provider.update({
        where: { id: input.id },
        data: { isActive: false },
      });

      return provider;
    }),

  // Reativar prestador
  activate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const provider = await prisma.provider.update({
        where: { id: input.id },
        data: { isActive: true },
      });

      return provider;
    }),

  // Buscar dados completos do prestador para o card
  getFullDetails: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const provider = await prisma.provider.findUnique({
        where: { id: input.id },
        include: {
          area: true,
          position: true,
          hierarchyLevel: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      if (!provider) {
        throw new Error("Prestador não encontrado");
      }

      return {
        id: provider.id,
        name: provider.name,
        salary: provider.salary.toNumber(),
        startDate: provider.startDate,
        seniority: provider.seniority,
        ndaStatus: provider.ndaStatus,
        ndaFileUrl: provider.ndaFileUrl,
        contractStatus: provider.contractStatus,
        contractFileUrl: provider.contractFileUrl,
        isActive: provider.isActive,
        area: {
          id: provider.area.id,
          name: provider.area.name,
        },
        position: {
          id: provider.position.id,
          name: provider.position.name,
        },
        hierarchyLevel: provider.hierarchyLevel
          ? {
              id: provider.hierarchyLevel.id,
              name: provider.hierarchyLevel.name,
              level: provider.hierarchyLevel.level,
            }
          : null,
        user: provider.user,
        createdAt: provider.createdAt,
        // Dados pessoais
        photoUrl: provider.photoUrl,
        birthDate: provider.birthDate,
        achievements: provider.achievements,
        // Endereço
        addressStreet: provider.addressStreet,
        addressNumber: provider.addressNumber,
        addressComplement: provider.addressComplement,
        addressNeighborhood: provider.addressNeighborhood,
        addressCity: provider.addressCity,
        addressState: provider.addressState,
        addressZipCode: provider.addressZipCode,
      };
    }),

  // Buscar histórico salarial do prestador
  getSalaryHistory: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const provider = await prisma.provider.findUnique({
        where: { id: input.id },
        select: {
          startDate: true,
          salary: true,
        },
      });

      if (!provider) {
        throw new Error("Prestador não encontrado");
      }

      // Buscar todas as solicitações de remuneração aprovadas
      const remunerationRequests = await prisma.remunerationRequest.findMany({
        where: {
          providerId: input.id,
          status: "APPROVED",
        },
        orderBy: { effectiveDate: "asc" },
        select: {
          currentSalary: true,
          newSalary: true,
          effectiveDate: true,
        },
      });

      // Construir histórico salarial
      const history: Array<{ date: Date; salary: number }> = [];

      // Se houver solicitações aprovadas, o salário inicial é o currentSalary da primeira
      // Caso contrário, usar o salário atual do prestador como único ponto
      if (remunerationRequests.length > 0) {
        // Adicionar o salário inicial (antes da primeira mudança)
        history.push({
          date: provider.startDate,
          salary: remunerationRequests[0].currentSalary.toNumber(),
        });

        // Adicionar cada mudança salarial
        for (const request of remunerationRequests) {
          history.push({
            date: request.effectiveDate,
            salary: request.newSalary.toNumber(),
          });
        }
      } else {
        // Sem histórico, apenas o salário atual
        history.push({
          date: provider.startDate,
          salary: provider.salary.toNumber(),
        });
      }

      return history;
    }),

  // Atualizar foto do prestador (Admin ou Dir. RH)
  updatePhoto: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        photoUrl: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { hierarchyLevel: true },
      });

      // Verificar permissão: Admin ou nível hierárquico >= 90 (Dir. RH)
      const hasPermission =
        currentUser?.isAdmin ||
        (currentUser?.hierarchyLevel && currentUser.hierarchyLevel.level >= 90);

      if (!hasPermission) {
        throw new Error("Acesso negado. Apenas Admin ou Dir. RH podem editar.");
      }

      const provider = await prisma.provider.update({
        where: { id: input.id },
        data: { photoUrl: input.photoUrl },
      });

      return { success: true, photoUrl: provider.photoUrl };
    }),

  // Atualizar dados pessoais do prestador (Admin ou Dir. RH)
  updatePersonalInfo: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        birthDate: z.string().or(z.date()).nullable().optional(),
        achievements: z.string().nullable().optional(),
        addressStreet: z.string().nullable().optional(),
        addressNumber: z.string().nullable().optional(),
        addressComplement: z.string().nullable().optional(),
        addressNeighborhood: z.string().nullable().optional(),
        addressCity: z.string().nullable().optional(),
        addressState: z.string().nullable().optional(),
        addressZipCode: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { hierarchyLevel: true },
      });

      // Verificar permissão: Admin ou nível hierárquico >= 90 (Dir. RH)
      const hasPermission =
        currentUser?.isAdmin ||
        (currentUser?.hierarchyLevel && currentUser.hierarchyLevel.level >= 90);

      if (!hasPermission) {
        throw new Error("Acesso negado. Apenas Admin ou Dir. RH podem editar.");
      }

      const { id, birthDate, ...rest } = input;

      const data: Record<string, unknown> = {};

      // Processar birthDate
      if (birthDate !== undefined) {
        data.birthDate = birthDate ? new Date(birthDate) : null;
      }

      // Processar outros campos
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          data[key] = value;
        }
      }

      const provider = await prisma.provider.update({
        where: { id },
        data,
      });

      return {
        success: true,
        birthDate: provider.birthDate,
        achievements: provider.achievements,
        addressStreet: provider.addressStreet,
        addressNumber: provider.addressNumber,
        addressComplement: provider.addressComplement,
        addressNeighborhood: provider.addressNeighborhood,
        addressCity: provider.addressCity,
        addressState: provider.addressState,
        addressZipCode: provider.addressZipCode,
      };
    }),
});
