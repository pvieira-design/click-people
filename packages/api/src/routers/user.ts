import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, publicProcedure, router } from "../index";

export const userRouter = router({
  // Obter dados do usuario atual com status
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        position: true,
        areas: {
          include: {
            area: true,
          },
        },
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
      areas: user.areas.map((ua) => ua.area),
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
        areas: {
          include: {
            area: true,
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
      areas: user.areas.map((ua) => ua.area),
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
        areaIds: z.array(z.string()).optional(),
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
          isAdmin: input.isAdmin,
        },
      });

      // Vincular areas se fornecidas
      if (input.areaIds && input.areaIds.length > 0) {
        // Remover areas existentes
        await prisma.userArea.deleteMany({
          where: { userId: input.userId },
        });

        // Adicionar novas areas
        await prisma.userArea.createMany({
          data: input.areaIds.map((areaId) => ({
            userId: input.userId,
            areaId,
          })),
        });
      }

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
        areaIds: z.array(z.string()).optional(),
        isAdmin: z.boolean().optional(),
        status: z.enum(["PENDING", "ACTIVE", "REJECTED", "DISABLED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const { userId, areaIds, ...data } = input;

      await prisma.user.update({
        where: { id: userId },
        data,
      });

      if (areaIds) {
        await prisma.userArea.deleteMany({
          where: { userId },
        });

        await prisma.userArea.createMany({
          data: areaIds.map((areaId) => ({
            userId,
            areaId,
          })),
        });
      }

      return { success: true };
    }),

  // Obter contagem de solicitacoes pendentes que o usuario pode aprovar
  getPendingCounts: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        position: true,
        areas: true,
      },
    });

    if (!user || !user.position) {
      return { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0, total: 0 };
    }

    const userLevel = user.position.level;
    const userAreaIds = user.areas.map((a) => a.areaId);
    const canApproveFlag = user.position.canApprove || user.isAdmin;

    // Se nao pode aprovar, retorna 0
    if (!canApproveFlag) {
      return { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0, total: 0 };
    }

    // Niveis minimos por role
    const ROLE_MIN_LEVELS = {
      AREA_DIRECTOR: 80,
      HR_DIRECTOR: 90,
      CFO: 95,
      CEO: 100,
    } as const;

    // Buscar todas as etapas pendentes
    const pendingSteps = await prisma.approvalStep.findMany({
      where: { status: "PENDING" },
      include: {
        recessRequest: { select: { id: true, providerArea: true, status: true } },
        terminationRequest: { select: { id: true, providerArea: true, status: true } },
        hiringRequest: { select: { id: true, areaId: true, status: true } },
        purchaseRequest: { select: { id: true, requesterArea: true, status: true } },
        remunerationRequest: { select: { id: true, providerArea: true, status: true } },
      },
    });

    // Filtrar apenas as que o usuario pode aprovar
    const counts = { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0 };

    for (const step of pendingSteps) {
      const minLevel = ROLE_MIN_LEVELS[step.role as keyof typeof ROLE_MIN_LEVELS];
      if (!minLevel || userLevel < minLevel) continue;

      // Verificar area para AREA_DIRECTOR
      if (step.role === "AREA_DIRECTOR") {
        let requestAreaId: string | undefined;
        if (step.recessRequest) requestAreaId = step.recessRequest.providerArea;
        else if (step.terminationRequest) requestAreaId = step.terminationRequest.providerArea;
        else if (step.hiringRequest) requestAreaId = step.hiringRequest.areaId;
        else if (step.purchaseRequest) requestAreaId = step.purchaseRequest.requesterArea;
        else if (step.remunerationRequest) requestAreaId = step.remunerationRequest.providerArea;

        if (requestAreaId && !userAreaIds.includes(requestAreaId)) continue;
      }

      // Contar por tipo
      if (step.recessRequest && step.recessRequest.status === "PENDING") {
        counts.recess++;
      } else if (step.terminationRequest && step.terminationRequest.status === "PENDING") {
        counts.termination++;
      } else if (step.hiringRequest && step.hiringRequest.status === "PENDING") {
        counts.hiring++;
      } else if (step.purchaseRequest && step.purchaseRequest.status === "PENDING") {
        counts.purchase++;
      } else if (step.remunerationRequest && step.remunerationRequest.status === "PENDING") {
        counts.remuneration++;
      }
    }

    return {
      ...counts,
      total: counts.recess + counts.termination + counts.hiring + counts.purchase + counts.remuneration,
    };
  }),
});
