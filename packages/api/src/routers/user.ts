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
});
