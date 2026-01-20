import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const auditRouter = router({
  // Listar logs de auditoria
  listLogs: protectedProcedure
    .input(
      z
        .object({
          entityType: z.string().optional(),
          action: z.string().optional(),
          userId: z.string().optional(),
          startDate: z.string().or(z.date()).optional(),
          endDate: z.string().or(z.date()).optional(),
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      // Verificar permissão (apenas admin)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado. Apenas administradores podem visualizar logs.");
      }

      const { entityType, action, userId, startDate, endDate, limit, offset } =
        input || { limit: 50, offset: 0 };

      const where: any = {};

      if (entityType) {
        where.entityType = entityType;
      }

      if (action) {
        where.action = action;
      }

      if (userId) {
        where.userId = userId;
      }

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) {
          where.createdAt.gte = new Date(startDate);
        }
        if (endDate) {
          where.createdAt.lte = new Date(endDate);
        }
      }

      const [logs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: limit,
          skip: offset,
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        }),
        prisma.auditLog.count({ where }),
      ]);

      return {
        logs,
        total,
        hasMore: offset + logs.length < total,
      };
    }),

  // Obter um log específico
  getLogById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verificar permissão (apenas admin)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado.");
      }

      const log = await prisma.auditLog.findUnique({
        where: { id: input.id },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      if (!log) {
        throw new Error("Log não encontrado");
      }

      return log;
    }),

  // Listar tipos de entidade distintos (para filtros)
  getEntityTypes: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado.");
    }

    const types = await prisma.auditLog.findMany({
      select: { entityType: true },
      distinct: ["entityType"],
    });

    return types.map((t) => t.entityType);
  }),

  // Listar ações distintas (para filtros)
  getActions: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado.");
    }

    const actions = await prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
    });

    return actions.map((a) => a.action);
  }),

  // Criar log de auditoria (interno)
  createLog: protectedProcedure
    .input(
      z.object({
        action: z.string(),
        entityType: z.string(),
        entityId: z.string().optional(),
        details: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const log = await prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          details: input.details,
          userId: ctx.session.user.id,
        },
      });

      return log;
    }),

  // Obter estatísticas do sistema
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado.");
    }

    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalProviders,
      activeProviders,
      totalAreas,
      totalPositions,
      logsToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { status: "PENDING" } }),
      prisma.provider.count(),
      prisma.provider.count({ where: { isActive: true } }),
      prisma.area.count(),
      prisma.position.count(),
      prisma.auditLog.count({
        where: {
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      users: { total: totalUsers, active: activeUsers, pending: pendingUsers },
      providers: { total: totalProviders, active: activeProviders },
      areas: totalAreas,
      positions: totalPositions,
      logsToday,
    };
  }),

  // Listar configurações do sistema
  listConfigs: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado.");
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: "asc" },
    });

    return configs;
  }),

  // Atualizar configuração do sistema
  updateConfig: protectedProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado.");
      }

      const config = await prisma.systemConfig.upsert({
        where: { key: input.key },
        create: {
          key: input.key,
          value: input.value,
        },
        update: {
          value: input.value,
        },
      });

      return config;
    }),
});
