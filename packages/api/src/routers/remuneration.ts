import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";
import {
  createApprovalSteps,
  approveStep,
  rejectStep,
  getCurrentPendingStep,
  canUserApproveStep,
} from "../lib/approval-engine";

export const remunerationRouter = router({
  // Listar todas as solicitações de mudança de remuneração
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
        include: { position: true, areas: true },
      });

      const isAdmin = currentUser?.isAdmin;
      const isDirector = (currentUser?.position?.level || 0) >= 80;

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

      const requests = await prisma.remunerationRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
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
            },
          },
        },
      });

      return requests.map((r) => ({
        id: r.id,
        status: r.status,
        currentSalary: r.currentSalary.toNumber(),
        newSalary: r.newSalary.toNumber(),
        effectiveDate: r.effectiveDate,
        priority: r.priority,
        reason: r.reason,
        providerArea: r.providerArea,
        providerPosition: r.providerPosition,
        createdAt: r.createdAt,
        provider: {
          ...r.provider,
          salary: r.provider.salary.toNumber(),
        },
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
      const request = await prisma.remunerationRequest.findUnique({
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
            },
          },
        },
      });

      if (!request) {
        throw new Error("Solicitação não encontrada");
      }

      return {
        ...request,
        currentSalary: request.currentSalary.toNumber(),
        newSalary: request.newSalary.toNumber(),
        provider: {
          ...request.provider,
          salary: request.provider.salary.toNumber(),
        },
        currentStep: request.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: request.approvalSteps.length,
      };
    }),

  // Criar nova solicitação de mudança de remuneração
  create: protectedProcedure
    .input(
      z.object({
        providerId: z.string(),
        newSalary: z.number().positive("Novo salário deve ser positivo"),
        effectiveDate: z.string().or(z.date()),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
        reason: z.string().min(10, "Justificativa deve ter pelo menos 10 caracteres"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { providerId, newSalary, effectiveDate, priority, reason } = input;

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
        throw new Error("Prestador inativo não pode ter remuneração alterada");
      }

      // Validar data futura
      const effective = new Date(effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (effective < today) {
        throw new Error("A data de vigência deve ser futura");
      }

      // Verificar se já existe solicitação pendente
      const existing = await prisma.remunerationRequest.findFirst({
        where: {
          providerId,
          status: "PENDING",
        },
      });

      if (existing) {
        throw new Error(
          "Já existe uma solicitação de mudança de remuneração pendente para este prestador"
        );
      }

      const currentSalary = provider.salary;

      // Criar solicitação
      const request = await prisma.remunerationRequest.create({
        data: {
          providerId,
          creatorId: ctx.session.user.id,
          currentSalary,
          newSalary,
          effectiveDate: effective,
          priority,
          reason,
          providerArea: provider.area.name,
          providerPosition: provider.position.name,
        },
      });

      // Criar etapas de aprovação
      await createApprovalSteps(
        "REMUNERATION",
        request.id,
        "remunerationRequestId",
        ctx.session.user.id,
        provider.areaId
      );

      // Verificar se todas as etapas foram auto-aprovadas
      const steps = await prisma.approvalStep.findMany({
        where: { remunerationRequestId: request.id },
      });

      const allApproved = steps.every((s) => s.status === "APPROVED");
      if (allApproved) {
        await prisma.remunerationRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED" },
        });
        // Atualizar salário do prestador
        await prisma.provider.update({
          where: { id: providerId },
          data: { salary: newSalary },
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
      const currentStep = await getCurrentPendingStep("REMUNERATION", input.requestId);

      if (!currentStep) {
        return { canApprove: false, step: null };
      }

      const request = await prisma.remunerationRequest.findUnique({
        where: { id: input.requestId },
        include: { provider: true },
      });

      const canApprove = await canUserApproveStep(
        ctx.session.user.id,
        currentStep.role,
        request?.provider.areaId
      );

      return { canApprove, step: currentStep };
    }),

  // Listar prestadores ativos para seleção
  listProviders: protectedProcedure.query(async () => {
    const providers = await prisma.provider.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        salary: true,
        area: { select: { id: true, name: true } },
        position: { select: { id: true, name: true } },
      },
    });

    return providers.map((p) => ({
      ...p,
      salary: p.salary.toNumber(),
    }));
  }),
});
