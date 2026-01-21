import { z } from "zod";

import { auth } from "@click-people/auth";
import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const userRouter = router({
  // Obter dados do usuario atual com status
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        position: true,
        hierarchyLevel: true,
        area: true,
      },
    });

    if (!user) {
      throw new Error("Usuario nao encontrado");
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      isAdmin: user.isAdmin,
      position: user.position,
      hierarchyLevel: user.hierarchyLevel,
      area: user.area,
    };
  }),

  // Listar todos os usuarios (apenas admin)
  list: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado");
    }

    const users = await prisma.user.findMany({
      include: {
        position: true,
        hierarchyLevel: true,
        area: true,
        provider: {
          select: {
            id: true,
            name: true,
            hierarchyLevel: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status,
      isAdmin: user.isAdmin,
      position: user.position,
      hierarchyLevel: user.hierarchyLevel,
      area: user.area,
      provider: user.provider,
      createdAt: user.createdAt,
    }));
  }),

  // Listar usuarios pendentes (apenas admin)
  listPending: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado");
    }

    const users = await prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
    });

    return users;
  }),

  // Aprovar usuario (apenas admin)
  approve: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        positionId: z.string().optional(),
        hierarchyLevelId: z.string().optional(),
        areaId: z.string().optional(),
        isAdmin: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Atualizar usuario para ACTIVE
      await prisma.user.update({
        where: { id: input.userId },
        data: {
          status: "ACTIVE",
          positionId: input.positionId,
          hierarchyLevelId: input.hierarchyLevelId,
          areaId: input.areaId,
          isAdmin: input.isAdmin,
        },
      });

      return { success: true };
    }),

  // Rejeitar usuario (apenas admin)
  reject: protectedProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      await prisma.user.update({
        where: { id: input.userId },
        data: { status: "REJECTED" },
      });

      return { success: true };
    }),

  // Atualizar usuario (apenas admin)
  update: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        name: z.string().optional(),
        positionId: z.string().optional(),
        hierarchyLevelId: z.string().optional(),
        areaId: z.string().optional(),
        isAdmin: z.boolean().optional(),
        status: z.enum(["PENDING", "ACTIVE", "REJECTED", "DISABLED"]).optional(),
        providerId: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const { userId, providerId, ...data } = input;

      // Atualizar dados do usuario
      await prisma.user.update({
        where: { id: userId },
        data,
      });

      // Gerenciar vinculo com prestador se providerId foi passado
      if (providerId !== undefined) {
        // Primeiro, desvincular qualquer prestador atual deste usuario
        await prisma.provider.updateMany({
          where: { userId },
          data: { userId: null },
        });

        // Se providerId nao e null, vincular o novo prestador
        if (providerId) {
          // Verificar se o prestador existe e nao esta vinculado a outro usuario
          const provider = await prisma.provider.findUnique({
            where: { id: providerId },
          });

          if (!provider) {
            throw new Error("Prestador nao encontrado");
          }

          if (provider.userId && provider.userId !== userId) {
            throw new Error("Prestador ja possui outro usuario vinculado");
          }

          await prisma.provider.update({
            where: { id: providerId },
            data: { userId },
          });

          // Sincronizar area, cargo e nivel do usuario com o prestador
          await prisma.user.update({
            where: { id: userId },
            data: {
              areaId: provider.areaId,
              positionId: provider.positionId,
              hierarchyLevelId: provider.hierarchyLevelId,
            },
          });
        }
      } else if (input.areaId || input.positionId || input.hierarchyLevelId) {
        // Se mudou area/cargo/nivel do usuario e ele tem prestador vinculado, sincronizar
        const linkedProvider = await prisma.provider.findUnique({
          where: { userId },
        });

        if (linkedProvider) {
          const syncData: { areaId?: string; positionId?: string; hierarchyLevelId?: string } = {};
          if (input.areaId) syncData.areaId = input.areaId;
          if (input.positionId) syncData.positionId = input.positionId;
          if (input.hierarchyLevelId) syncData.hierarchyLevelId = input.hierarchyLevelId;

          if (Object.keys(syncData).length > 0) {
            await prisma.provider.update({
              where: { id: linkedProvider.id },
              data: syncData,
            });
          }
        }
      }

      return { success: true };
    }),

  // Criar usuario diretamente (apenas admin)
  createByAdmin: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        email: z.string().email(),
        password: z.string().min(8),
        positionId: z.string().optional(),
        hierarchyLevelId: z.string().optional(),
        areaId: z.string().optional(),
        isAdmin: z.boolean().default(false),
        providerId: z.string().optional(),
        // Campos para criar prestador junto
        createAsProvider: z.boolean().default(false),
        providerData: z.object({
          salary: z.number().positive(),
          startDate: z.string().or(z.date()),
          seniority: z.enum(["JUNIOR", "MID", "SENIOR", "LEAD", "PRINCIPAL", "NA"]).default("NA"),
          ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
          contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
        }).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Verificar se email ja existe
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });

      if (existingUser) {
        throw new Error("Email ja cadastrado");
      }

      // Se criar como prestador, area e cargo sao obrigatorios
      if (input.createAsProvider) {
        if (!input.areaId) {
          throw new Error("Area e obrigatoria para criar como prestador");
        }
        if (!input.positionId) {
          throw new Error("Cargo e obrigatorio para criar como prestador");
        }
        if (!input.providerData) {
          throw new Error("Dados do prestador sao obrigatorios");
        }
      }

      // Se providerId fornecido, verificar se existe e nao tem usuario vinculado
      if (input.providerId) {
        const provider = await prisma.provider.findUnique({
          where: { id: input.providerId },
        });

        if (!provider) {
          throw new Error("Prestador nao encontrado");
        }

        if (provider.userId) {
          throw new Error("Prestador ja possui usuario vinculado");
        }
      }

      // Criar usuario diretamente via Prisma (sem fazer login automatico)
      const { hashPassword } = await import("better-auth/crypto");
      const crypto = await import("crypto");
      const generateId = () => crypto.randomBytes(16).toString("hex");
      const hashedPassword = await hashPassword(input.password);

      // Criar o usuario
      const newUser = await prisma.user.create({
        data: {
          id: generateId(),
          name: input.name,
          email: input.email,
          emailVerified: true,
          status: "ACTIVE",
          positionId: input.positionId,
          hierarchyLevelId: input.hierarchyLevelId,
          areaId: input.areaId,
          isAdmin: input.isAdmin,
        },
      });

      // Criar a conta de credencial vinculada ao usuario
      await prisma.account.create({
        data: {
          id: generateId(),
          userId: newUser.id,
          accountId: newUser.id,
          providerId: "credential",
          password: hashedPassword,
        },
      });

      const newUserId = newUser.id;

      // Vincular prestador existente se fornecido
      if (input.providerId) {
        await prisma.provider.update({
          where: { id: input.providerId },
          data: { userId: newUserId },
        });
      }

      // Criar novo prestador se solicitado
      if (input.createAsProvider && input.providerData && input.areaId && input.positionId) {
        await prisma.provider.create({
          data: {
            name: input.name,
            salary: input.providerData.salary,
            startDate: new Date(input.providerData.startDate),
            seniority: input.providerData.seniority,
            ndaStatus: input.providerData.ndaStatus,
            contractStatus: input.providerData.contractStatus,
            areaId: input.areaId,
            positionId: input.positionId,
            hierarchyLevelId: input.hierarchyLevelId,
            userId: newUserId,
          },
        });
      }

      return { success: true, userId: newUserId };
    }),

  // Alterar senha de usuario (apenas admin)
  setPassword: protectedProcedure
    .input(
      z.object({
        userId: z.string(),
        newPassword: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Verificar se usuario existe
      const targetUser = await prisma.user.findUnique({
        where: { id: input.userId },
      });

      if (!targetUser) {
        throw new Error("Usuario nao encontrado");
      }

      // Alterar senha diretamente na tabela account
      const { hashPassword } = await import("better-auth/crypto");
      const hashedPassword = await hashPassword(input.newPassword);

      await prisma.account.updateMany({
        where: {
          userId: input.userId,
          providerId: "credential",
        },
        data: {
          password: hashedPassword,
        },
      });

      return { success: true };
    }),

  // Obter contagem de solicitacoes pendentes que o usuario pode aprovar
  getPendingCounts: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        hierarchyLevel: true,
        area: true,
        directorOfAreas: true,
        cLevelOfAreas: true,
      },
    });

    if (!user) {
      return { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0, total: 0 };
    }

    // Verificar se o usuario e diretor ou C-Level de alguma area
    const directorOfAreaIds = user.directorOfAreas.map((a) => a.id);
    const cLevelOfAreaIds = user.cLevelOfAreas.map((a) => a.id);
    const allResponsibleAreaIds = [...new Set([...directorOfAreaIds, ...cLevelOfAreaIds])];
    const canApproveFlag = allResponsibleAreaIds.length > 0 || user.isAdmin;

    // Se nao pode aprovar, retorna 0
    if (!canApproveFlag) {
      return { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0, total: 0 };
    }

    // Buscar todas as etapas pendentes com a area de aprovacao
    const pendingSteps = await prisma.approvalStep.findMany({
      where: { status: "PENDING" },
      include: {
        approvalArea: { select: { id: true } },
        recessRequest: { select: { id: true, status: true } },
        terminationRequest: { select: { id: true, status: true } },
        hiringRequest: { select: { id: true, status: true } },
        purchaseRequest: { select: { id: true, status: true } },
        remunerationRequest: { select: { id: true, status: true } },
      },
    });

    // Filtrar apenas as que o usuario pode aprovar e contar solicitacoes unicas
    const uniqueRequests = {
      recess: new Set<string>(),
      termination: new Set<string>(),
      hiring: new Set<string>(),
      purchase: new Set<string>(),
      remuneration: new Set<string>(),
    };

    for (const step of pendingSteps) {
      // Admin pode aprovar tudo
      if (!user.isAdmin) {
        // Verificar se o usuario e diretor ou C-Level da area de aprovacao
        const stepAreaId = step.approvalAreaId;
        if (!stepAreaId || !allResponsibleAreaIds.includes(stepAreaId)) continue;
      }

      // Adicionar ID da solicitacao ao Set (garante contagem unica)
      if (step.recessRequest && step.recessRequest.status === "PENDING") {
        uniqueRequests.recess.add(step.recessRequest.id);
      } else if (step.terminationRequest && step.terminationRequest.status === "PENDING") {
        uniqueRequests.termination.add(step.terminationRequest.id);
      } else if (step.hiringRequest && step.hiringRequest.status === "PENDING") {
        uniqueRequests.hiring.add(step.hiringRequest.id);
      } else if (step.purchaseRequest && step.purchaseRequest.status === "PENDING") {
        uniqueRequests.purchase.add(step.purchaseRequest.id);
      } else if (step.remunerationRequest && step.remunerationRequest.status === "PENDING") {
        uniqueRequests.remuneration.add(step.remunerationRequest.id);
      }
    }

    const counts = {
      recess: uniqueRequests.recess.size,
      termination: uniqueRequests.termination.size,
      hiring: uniqueRequests.hiring.size,
      purchase: uniqueRequests.purchase.size,
      remuneration: uniqueRequests.remuneration.size,
    };

    return {
      ...counts,
      total: counts.recess + counts.termination + counts.hiring + counts.purchase + counts.remuneration,
    };
  }),
});
