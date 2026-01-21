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

export const terminationRouter = router({
  // Listar todas as solicitações de desligamento
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

      const requests = await prisma.terminationRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          provider: {
            select: { id: true, name: true, isActive: true },
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
      const request = await prisma.terminationRequest.findUnique({
        where: { id: input.id },
        include: {
          provider: {
            select: { id: true, name: true, salary: true, isActive: true },
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

  // Criar nova solicitação de desligamento
  create: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        reason: z.string().min(10, "Motivo deve ter pelo menos 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { providerId, reason } = input;

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
        throw new Error("Prestador já está inativo");
      }

      // Verificar se já existe solicitação pendente
      const existing = await prisma.terminationRequest.findFirst({
        where: {
          providerId,
          status: "PENDING",
        },
      });

      if (existing) {
        throw new Error(
          "Já existe uma solicitação de desligamento pendente para este prestador"
        );
      }

      // Criar solicitação
      const request = await prisma.terminationRequest.create({
        data: {
          providerId,
          creatorId: ctx.session.user.id,
          reason,
          providerArea: provider.area.name,
          providerPosition: provider.position.name,
        },
      });

      // Criar etapas de aprovação
      await createApprovalSteps(
        "TERMINATION",
        request.id,
        "terminationRequestId",
        ctx.session.user.id,
        provider.areaId
      );

      // Verificar se todas as etapas foram auto-aprovadas
      const steps = await prisma.approvalStep.findMany({
        where: { terminationRequestId: request.id },
      });

      const allApproved = steps.every((s) => s.status === "APPROVED");
      if (allApproved) {
        await prisma.terminationRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED" },
        });
        // Desativar prestador
        await prisma.provider.update({
          where: { id: providerId },
          data: { isActive: false },
        });
      }

      return request;
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
      const currentStep = await getCurrentPendingStep("TERMINATION", input.requestId);

      if (!currentStep) {
        return { canApprove: false, isAdminOverride: false, step: null, potentialApprovers: [] };
      }

      // Buscar área do request para verificar permissão
      const request = await prisma.terminationRequest.findUnique({
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
