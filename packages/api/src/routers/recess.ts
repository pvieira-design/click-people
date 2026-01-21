import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";
import {
  createApprovalSteps,
  approveStep,
  rejectStep,
  getCurrentPendingStep,
  checkApprovalPermission,
  getPotentialApprovers,
} from "../lib/approval-engine";

export const recessRouter = router({
  // Listar todas as solicitações de recesso
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
          providerId: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, providerId } = input || {};

      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { hierarchyLevel: true, area: true },
      });

      const isAdmin = currentUser?.isAdmin;
      const isDirector = (currentUser?.hierarchyLevel?.level || 0) >= 80;

      // Filtros base
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (providerId) {
        where.providerId = providerId;
      }

      // Se não for admin nem diretor, só pode ver suas próprias solicitações
      if (!isAdmin && !isDirector) {
        where.creatorId = ctx.session.user.id;
      }

      const requests = await prisma.recessRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          provider: {
            select: { id: true, name: true },
          },
          creator: {
            select: { id: true, name: true },
          },
          approvalSteps: {
            orderBy: { stepNumber: "asc" },
            include: {
              approver: {
                select: { id: true, name: true },
              },
              approvalArea: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      return requests.map((r) => ({
        id: r.id,
        status: r.status,
        startDate: r.startDate,
        endDate: r.endDate,
        daysCount: r.daysCount,
        reason: r.reason,
        providerArea: r.providerArea,
        providerPosition: r.providerPosition,
        createdAt: r.createdAt,
        provider: r.provider,
        creator: r.creator,
        approvalSteps: r.approvalSteps,
        currentStep: r.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: r.approvalSteps.length,
      }));
    }),

  // Obter uma solicitação específica
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const request = await prisma.recessRequest.findUnique({
        where: { id: input.id },
        include: {
          provider: {
            select: { id: true, name: true, salary: true },
          },
          creator: {
            select: { id: true, name: true },
          },
          approvalSteps: {
            orderBy: { stepNumber: "asc" },
            include: {
              approver: {
                select: { id: true, name: true },
              },
              approvalArea: {
                select: { id: true, name: true },
              },
            },
          },
        },
      });

      if (!request) {
        throw new Error("Solicitação não encontrada");
      }

      return {
        ...request,
        provider: {
          ...request.provider,
          salary: request.provider.salary.toNumber(),
        },
        currentStep: request.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: request.approvalSteps.length,
      };
    }),

  // Criar nova solicitação de recesso
  create: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        startDate: z.string().or(z.date()),
        endDate: z.string().or(z.date()),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { providerId, startDate, endDate, reason } = input;

      // Buscar dados do prestador
      const provider = await prisma.provider.findUnique({
        where: { id: providerId },
        include: {
          area: true,
          position: true,
        },
      });

      if (!provider) {
        throw new Error("Prestador não encontrado");
      }

      if (!provider.isActive) {
        throw new Error("Prestador inativo não pode solicitar recesso");
      }

      // Calcular dias
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const daysCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      // Verificar sobreposição com outras solicitações
      const overlapping = await prisma.recessRequest.findFirst({
        where: {
          providerId,
          status: { not: "REJECTED" },
          OR: [
            {
              startDate: { lte: end },
              endDate: { gte: start },
            },
          ],
        },
      });

      if (overlapping) {
        throw new Error(
          "Já existe uma solicitação de recesso para este período"
        );
      }

      // Verificar total de dias no ano
      const year = start.getFullYear();
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);

      const yearRequests = await prisma.recessRequest.findMany({
        where: {
          providerId,
          status: { not: "REJECTED" },
          startDate: { gte: yearStart, lte: yearEnd },
        },
        select: { daysCount: true },
      });

      const totalDaysInYear =
        yearRequests.reduce((sum, r) => sum + r.daysCount, 0) + daysCount;

      // Criar solicitação
      const request = await prisma.recessRequest.create({
        data: {
          providerId,
          creatorId: ctx.session.user.id,
          startDate: start,
          endDate: end,
          daysCount,
          reason,
          providerArea: provider.area.name,
          providerPosition: provider.position.name,
        },
      });

      // Criar etapas de aprovação
      await createApprovalSteps(
        "RECESS",
        request.id,
        "recessRequestId",
        ctx.session.user.id,
        provider.areaId
      );

      // Verificar se todas as etapas foram auto-aprovadas
      const steps = await prisma.approvalStep.findMany({
        where: { recessRequestId: request.id },
      });

      const allApproved = steps.every((s) => s.status === "APPROVED");
      if (allApproved) {
        await prisma.recessRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED" },
        });
      }

      return {
        ...request,
        totalDaysInYear,
        warning: totalDaysInYear > 20 ? "Atenção: Mais de 20 dias de recesso no ano" : null,
      };
    }),

  // Aprovar etapa
  approve: protectedProcedure
    .input(
      z.object({
        stepId: z.string(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return approveStep(input.stepId, ctx.session.user.id, input.comment);
    }),

  // Rejeitar etapa
  reject: protectedProcedure
    .input(
      z.object({
        stepId: z.string(),
        comment: z.string().min(3, "Comentário obrigatório para rejeição"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return rejectStep(input.stepId, ctx.session.user.id, input.comment);
    }),

  // Verificar se usuário pode aprovar etapa atual
  canApprove: protectedProcedure
    .input(z.object({ requestId: z.string() }))
    .query(async ({ ctx, input }) => {
      const currentStep = await getCurrentPendingStep("RECESS", input.requestId);

      if (!currentStep) {
        return { canApprove: false, isAdminOverride: false, step: null, potentialApprovers: [] };
      }

      // Buscar área do request para verificar permissão
      const request = await prisma.recessRequest.findUnique({
        where: { id: input.requestId },
        include: { provider: true },
      });

      const permission = await checkApprovalPermission(
        ctx.session.user.id,
        currentStep.role,
        request?.provider.areaId,
        currentStep.approvalAreaId || undefined
      );

      // Buscar aprovadores potenciais para a etapa atual
      const potentialApprovers = await getPotentialApprovers(
        currentStep.role,
        request?.provider.areaId,
        currentStep.approvalAreaId || undefined
      );

      return {
        canApprove: permission.canApprove,
        isAdminOverride: permission.isAdminOverride,
        step: currentStep,
        potentialApprovers,
      };
    }),

  // Obter histórico de recesso de um prestador
  getProviderHistory: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        year: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const { providerId, year } = input;

      const where: any = { providerId };

      if (year) {
        const yearStart = new Date(year, 0, 1);
        const yearEnd = new Date(year, 11, 31);
        where.startDate = { gte: yearStart, lte: yearEnd };
      }

      const requests = await prisma.recessRequest.findMany({
        where,
        orderBy: { startDate: "desc" },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
          daysCount: true,
          reason: true,
        },
      });

      const totalDays = requests
        .filter((r) => r.status !== "REJECTED")
        .reduce((sum, r) => sum + r.daysCount, 0);

      return {
        requests,
        totalDays,
        warning: totalDays > 20 ? "Atenção: Mais de 20 dias de recesso no ano" : null,
      };
    }),

  // Listar prestadores ativos para seleção
  listProviders: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        area: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
    });

    return providers;
  }),
});
