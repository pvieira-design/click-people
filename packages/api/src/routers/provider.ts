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
        level: provider.position.level,
      },
      user: provider.user,
      createdAt: provider.createdAt,
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
          level: provider.position.level,
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
        ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
        contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).default("NOT_SIGNED"),
        areaId: z.string(),
        positionId: z.string(),
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

      const provider = await prisma.provider.create({
        data: {
          name: input.name,
          salary: input.salary,
          startDate: new Date(input.startDate),
          ndaStatus: input.ndaStatus,
          contractStatus: input.contractStatus,
          areaId: input.areaId,
          positionId: input.positionId,
          userId: input.userId,
        },
      });

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
        ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
        contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
        isActive: z.boolean().optional(),
        areaId: z.string().optional(),
        positionId: z.string().optional(),
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

      const { id, startDate, ...rest } = input;

      const data: any = { ...rest };
      if (startDate) {
        data.startDate = new Date(startDate);
      }

      const provider = await prisma.provider.update({
        where: { id },
        data,
      });

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
});
