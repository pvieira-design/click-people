import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const positionRouter = router({
  // Listar todos os cargos
  list: protectedProcedure.query(async () => {
    const positions = await prisma.position.findMany({
      orderBy: { level: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            providers: true,
          },
        },
      },
    });

    return positions.map((position) => ({
      id: position.id,
      name: position.name,
      level: position.level,
      canApprove: position.canApprove,
      userCount: position._count.users,
      providerCount: position._count.providers,
      createdAt: position.createdAt,
    }));
  }),

  // Obter cargo por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const position = await prisma.position.findUnique({
        where: { id: input.id },
      });

      return position;
    }),

  // Criar cargo (apenas admin)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      level: z.number().min(1).max(100),
      canApprove: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const position = await prisma.position.create({
        data: input,
      });

      return position;
    }),

  // Atualizar cargo (apenas admin)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(2).optional(),
      level: z.number().min(1).max(100).optional(),
      canApprove: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const { id, ...data } = input;

      const position = await prisma.position.update({
        where: { id },
        data,
      });

      return position;
    }),

  // Deletar cargo (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      await prisma.position.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
