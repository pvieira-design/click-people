import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

export const areaRouter = router({
  // Listar todas as areas
  list: protectedProcedure.query(async () => {
    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
      include: {
        cLevel: {
          select: {
            id: true,
            name: true,
            email: true,
            hierarchyLevel: {
              select: { name: true, level: true },
            },
          },
        },
        director: {
          select: {
            id: true,
            name: true,
            email: true,
            hierarchyLevel: {
              select: { name: true, level: true },
            },
          },
        },
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            hierarchyLevel: {
              select: { name: true, level: true },
            },
          },
        },
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
      cLevelId: area.cLevelId,
      cLevel: area.cLevel,
      directorId: area.directorId,
      director: area.director,
      leaderId: area.leaderId,
      leader: area.leader,
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
          director: {
            select: {
              id: true,
              name: true,
              email: true,
              hierarchyLevel: {
                select: { name: true, level: true },
              },
            },
          },
          users: true,
          providers: true,
          positions: {
            include: {
              position: true,
            },
          },
        },
      });

      if (!area) return null;

      return {
        ...area,
        positions: area.positions.map((ap) => ap.position),
      };
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
      cLevelId: z.string().nullable().optional(),
      directorId: z.string().nullable().optional(),
      leaderId: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const data: {
        name: string;
        cLevelId?: string | null;
        directorId?: string | null;
        leaderId?: string | null;
      } = { name: input.name };

      if (input.cLevelId !== undefined) {
        data.cLevelId = input.cLevelId;
      }
      if (input.directorId !== undefined) {
        data.directorId = input.directorId;
      }
      if (input.leaderId !== undefined) {
        data.leaderId = input.leaderId;
      }

      const area = await prisma.area.update({
        where: { id: input.id },
        data,
        include: {
          cLevel: { select: { id: true, name: true } },
          director: { select: { id: true, name: true } },
          leader: { select: { id: true, name: true } },
        },
      });

      return area;
    }),

  // Definir responsável por uma área (C-level, Diretor ou Líder)
  setAreaRole: protectedProcedure
    .input(z.object({
      areaId: z.string(),
      role: z.enum(["cLevel", "director", "leader"]),
      userId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const dataMap = {
        cLevel: { cLevelId: input.userId },
        director: { directorId: input.userId },
        leader: { leaderId: input.userId },
      };

      const area = await prisma.area.update({
        where: { id: input.areaId },
        data: dataMap[input.role],
        include: {
          cLevel: { select: { id: true, name: true, email: true } },
          director: { select: { id: true, name: true, email: true } },
          leader: { select: { id: true, name: true, email: true } },
        },
      });

      return area;
    }),

  // Backward compatibility - manter setDirector
  setDirector: protectedProcedure
    .input(z.object({
      areaId: z.string(),
      directorId: z.string().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      const area = await prisma.area.update({
        where: { id: input.areaId },
        data: { directorId: input.directorId },
        include: {
          director: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      return area;
    }),

  // Listar áreas sem diretor configurado (para alertas)
  listWithoutDirector: protectedProcedure.query(async () => {
    const areas = await prisma.area.findMany({
      where: { directorId: null },
      orderBy: { name: "asc" },
    });

    return areas;
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
