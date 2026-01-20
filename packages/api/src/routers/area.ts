import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const areaRouter = router({
  // Listar todas as areas
  list: protectedProcedure.query(async () => {
    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            providers: true,
          },
        },
      },
    });

    return areas.map((area) => ({
      id: area.id,
      name: area.name,
      userCount: area._count.users,
      providerCount: area._count.providers,
      createdAt: area.createdAt,
    }));
  }),

  // Obter area por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const area = await prisma.area.findUnique({
        where: { id: input.id },
        include: {
          users: {
            include: {
              user: true,
            },
          },
          providers: true,
        },
      });

      return area;
    }),

  // Criar area (apenas admin)
  create: protectedProcedure
    .input(z.object({ name: z.string().min(2) }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const area = await prisma.area.create({
        data: { name: input.name },
      });

      return area;
    }),

  // Atualizar area (apenas admin)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const area = await prisma.area.update({
        where: { id: input.id },
        data: { name: input.name },
      });

      return area;
    }),

  // Deletar area (apenas admin)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      await prisma.area.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
