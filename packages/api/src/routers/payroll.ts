import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

// Percentuais de bônus por tier
const BONUS_PERCENTAGES = {
  NONE: 0,
  BRONZE: 0.1,
  SILVER: 0.15,
  GOLD: 0.2,
} as const;

export const payrollRouter = router({
  // Listar todos os prestadores para a folha (apenas ativos por padrão)
  list: protectedProcedure
    .input(
      z
        .object({
          includeInactive: z.boolean().default(false),
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const { includeInactive = false, search } = input || {};

      const providers = await prisma.provider.findMany({
        where: {
          ...(includeInactive ? {} : { isActive: true }),
          ...(search
            ? {
                OR: [
                  { name: { contains: search, mode: "insensitive" } },
                  { area: { name: { contains: search, mode: "insensitive" } } },
                  { position: { name: { contains: search, mode: "insensitive" } } },
                ],
              }
            : {}),
        },
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
        },
      }));
    }),

  // Atualizar dados editáveis da folha (salário, NDA, contrato)
  updateProvider: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        salary: z.number().positive().optional(),
        ndaStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
        contractStatus: z.enum(["SIGNED", "NOT_SIGNED"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissões (admin ou Dir. RH)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { hierarchyLevel: true },
      });

      const isAdmin = currentUser?.isAdmin;
      const isHRDirector = currentUser?.hierarchyLevel?.level === 90;

      if (!isAdmin && !isHRDirector) {
        throw new Error("Acesso negado. Apenas Admin ou Diretor RH podem editar a folha.");
      }

      const { id, ...data } = input;

      const provider = await prisma.provider.update({
        where: { id },
        data,
      });

      return provider;
    }),

  // Obter totalizadores da folha
  getTotals: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      select: { salary: true },
    });

    const totalProviders = providers.length;
    const totalSalary = providers.reduce((sum, p) => sum + p.salary.toNumber(), 0);

    return {
      totalProviders,
      totalSalary,
    };
  }),

  // ==================== BÔNUS ====================

  // Listar bônus por mês
  listBonus: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const { year, month } = input;

      // Buscar áreas com seus bônus do mês
      const areas = await prisma.area.findMany({
        orderBy: { name: "asc" },
        include: {
          bonusRecords: {
            where: { year, month },
          },
          providers: {
            where: { isActive: true },
            select: { salary: true },
          },
        },
      });

      return areas.map((area) => {
        const bonusRecord = area.bonusRecords[0];
        const tier = bonusRecord?.tier || "NONE";
        const percentage = BONUS_PERCENTAGES[tier];

        const totalSalary = area.providers.reduce((sum, p) => sum + p.salary.toNumber(), 0);
        const totalBonus = totalSalary * percentage;

        return {
          areaId: area.id,
          areaName: area.name,
          tier,
          percentage,
          providerCount: area.providers.length,
          totalSalary,
          totalBonus,
          totalRemuneration: totalSalary + totalBonus,
        };
      });
    }),

  // Definir tier de bônus para uma área em um mês
  setBonus: protectedProcedure
    .input(
      z.object({
        areaId: z.string(),
        year: z.number(),
        month: z.number().min(1).max(12),
        tier: z.enum(["NONE", "BRONZE", "SILVER", "GOLD"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verificar permissões (admin ou Dir. RH)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { hierarchyLevel: true },
      });

      const isAdmin = currentUser?.isAdmin;
      const isHRDirector = currentUser?.hierarchyLevel?.level === 90;

      if (!isAdmin && !isHRDirector) {
        throw new Error("Acesso negado. Apenas Admin ou Diretor RH podem definir bônus.");
      }

      const { areaId, year, month, tier } = input;

      // Upsert: criar ou atualizar
      const bonusRecord = await prisma.bonusRecord.upsert({
        where: {
          areaId_year_month: { areaId, year, month },
        },
        create: {
          areaId,
          year,
          month,
          tier,
        },
        update: {
          tier,
        },
      });

      return bonusRecord;
    }),

  // Obter totalizadores de bônus do mês
  getBonusTotals: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const { year, month } = input;

      const areas = await prisma.area.findMany({
        include: {
          bonusRecords: {
            where: { year, month },
          },
          providers: {
            where: { isActive: true },
            select: { salary: true },
          },
        },
      });

      let totalProviders = 0;
      let totalSalary = 0;
      let totalBonus = 0;

      for (const area of areas) {
        const tier = area.bonusRecords[0]?.tier || "NONE";
        const percentage = BONUS_PERCENTAGES[tier];
        const areaSalary = area.providers.reduce((sum, p) => sum + p.salary.toNumber(), 0);
        const areaBonus = areaSalary * percentage;

        totalProviders += area.providers.length;
        totalSalary += areaSalary;
        totalBonus += areaBonus;
      }

      return {
        totalProviders,
        totalSalary,
        totalBonus,
        totalRemuneration: totalSalary + totalBonus,
      };
    }),

  // Listar prestadores com bônus calculado
  listProvidersWithBonus: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        month: z.number().min(1).max(12),
      })
    )
    .query(async ({ input }) => {
      const { year, month } = input;

      // Buscar todos os bônus do mês
      const bonusRecords = await prisma.bonusRecord.findMany({
        where: { year, month },
      });

      const bonusByArea = new Map(bonusRecords.map((b) => [b.areaId, b.tier]));

      // Buscar prestadores ativos
      const providers = await prisma.provider.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
        include: {
          area: true,
          position: true,
        },
      });

      return providers.map((provider) => {
        const tier = bonusByArea.get(provider.areaId) || "NONE";
        const percentage = BONUS_PERCENTAGES[tier];
        const salary = provider.salary.toNumber();
        const bonus = salary * percentage;

        return {
          id: provider.id,
          name: provider.name,
          area: provider.area.name,
          position: provider.position.name,
          salary,
          tier,
          percentage,
          bonus,
          totalRemuneration: salary + bonus,
        };
      });
    }),
});
