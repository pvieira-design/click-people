import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const hierarchyLevelRouter = router({
  // Listar todos os níveis hierárquicos
  list: protectedProcedure.query(async () => {
    const levels = await prisma.hierarchyLevel.findMany({
      orderBy: { level: "asc" },
      include: {
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return levels.map((level) => ({
      id: level.id,
      name: level.name,
      level: level.level,
      canApprove: level.canApprove,
      userCount: level._count.users,
    }));
  }),

  // Obter nível por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return prisma.hierarchyLevel.findUnique({
        where: { id: input.id },
      });
    }),

  // Criar nível hierárquico (apenas admin)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      level: z.number().min(1).max(200),
      canApprove: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      return prisma.hierarchyLevel.create({
        data: input,
      });
    }),

  // Atualizar nível hierárquico (apenas admin)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(2).optional(),
      level: z.number().min(1).max(200).optional(),
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

      return prisma.hierarchyLevel.update({
        where: { id },
        data,
      });
    }),

  // Deletar nível hierárquico (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Verificar se há usuários usando este nível
      const usersCount = await prisma.user.count({
        where: { hierarchyLevelId: input.id },
      });

      if (usersCount > 0) {
        throw new Error(
          `Não é possível excluir este nível. Há ${usersCount} usuário(s) associado(s).`
        );
      }

      await prisma.hierarchyLevel.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
