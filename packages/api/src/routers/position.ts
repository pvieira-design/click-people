import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const positionRouter = router({
  // Listar todos os cargos
  list: protectedProcedure.query(async () => {
    const positions = await prisma.position.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            users: true,
            providers: true,
          },
        },
        areas: {
          include: {
            area: true,
          },
        },
      },
    });

    return positions.map((position) => ({
      id: position.id,
      name: position.name,
      userCount: position._count.users,
      providerCount: position._count.providers,
      createdAt: position.createdAt,
      areas: position.areas.map((ap) => ({
        id: ap.area.id,
        name: ap.area.name,
      })),
      isGlobal: position.areas.length === 0,
    }));
  }),

  // Listar cargos por área (inclui cargos globais)
  listByArea: protectedProcedure
    .input(z.object({ areaId: z.string() }))
    .query(async ({ input }) => {
      // Buscar cargos da área específica
      const positionsInArea = await prisma.position.findMany({
        where: {
          areas: {
            some: {
              areaId: input.areaId,
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Buscar cargos globais (sem nenhuma área associada)
      const globalPositions = await prisma.position.findMany({
        where: {
          areas: {
            none: {},
          },
        },
        orderBy: { name: "asc" },
      });

      // Combinar e ordenar por nome
      const allPositions = [...positionsInArea, ...globalPositions].sort(
        (a, b) => a.name.localeCompare(b.name)
      );

      return allPositions.map((position) => ({
        id: position.id,
        name: position.name,
      }));
    }),

  // Obter cargo por ID
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const position = await prisma.position.findUnique({
        where: { id: input.id },
        include: {
          areas: {
            include: {
              area: true,
            },
          },
        },
      });

      if (!position) return null;

      return {
        ...position,
        areas: position.areas.map((ap) => ({
          id: ap.area.id,
          name: ap.area.name,
        })),
        isGlobal: position.areas.length === 0,
      };
    }),

  // Criar cargo (apenas admin)
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      areaIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const { areaIds, ...data } = input;

      const position = await prisma.position.create({
        data: {
          ...data,
          areas: areaIds && areaIds.length > 0
            ? {
                create: areaIds.map((areaId) => ({ areaId })),
              }
            : undefined,
        },
      });

      return position;
    }),

  // Atualizar cargo (apenas admin)
  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      name: z.string().min(2).optional(),
      areaIds: z.array(z.string()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const { id, areaIds, ...data } = input;

      // Atualizar cargo
      const position = await prisma.position.update({
        where: { id },
        data,
      });

      // Se areaIds foi passado, atualizar as áreas (substituir todas)
      if (areaIds !== undefined) {
        // Remover todas as áreas existentes
        await prisma.areaPosition.deleteMany({
          where: { positionId: id },
        });

        // Adicionar novas áreas
        if (areaIds.length > 0) {
          await prisma.areaPosition.createMany({
            data: areaIds.map((areaId) => ({ areaId, positionId: id })),
          });
        }
      }

      return position;
    }),

  // Definir áreas de um cargo (apenas admin)
  setAreas: protectedProcedure
    .input(z.object({
      positionId: z.string(),
      areaIds: z.array(z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Remover todas as áreas existentes
      await prisma.areaPosition.deleteMany({
        where: { positionId: input.positionId },
      });

      // Adicionar novas áreas (se houver)
      if (input.areaIds.length > 0) {
        await prisma.areaPosition.createMany({
          data: input.areaIds.map((areaId) => ({
            areaId,
            positionId: input.positionId,
          })),
        });
      }

      return { success: true };
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
