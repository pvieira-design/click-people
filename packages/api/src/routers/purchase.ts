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

export const purchaseRouter = router({
  // Listar todas as solicitações de compra
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status } = input || {};

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

      // Se não for admin nem diretor, só pode ver suas próprias solicitações
      if (!isAdmin && !isDirector) {
        where.creatorId = ctx.session.user.id;
      }

      const requests = await prisma.purchaseRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
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
        description: r.description,
        value: r.value.toNumber(),
        paymentDate: r.paymentDate,
        requesterArea: r.requesterArea,
        requesterPosition: r.requesterPosition,
        createdAt: r.createdAt,
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
      const request = await prisma.purchaseRequest.findUnique({
        where: { id: input.id },
        include: {
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
        value: request.value.toNumber(),
        currentStep: request.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: request.approvalSteps.length,
      };
    }),

  // Criar nova solicitação de compra
  create: protectedProcedure
    .input(
      z.object({
        description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
        value: z.number().positive("Valor deve ser positivo"),
        paymentDate: z.string().or(z.date()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { description, value, paymentDate } = input;

      // Buscar dados do solicitante
      const creator = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: {
          position: true,
          areas: {
            include: { area: true },
          },
        },
      });

      if (!creator) throw new Error("Usuário não encontrado");

      const requesterArea = creator.areas[0]?.area.name || "Sem área";
      const requesterPosition = creator.position?.name || "Sem cargo";
      const requesterAreaId = creator.areas[0]?.areaId;

      // Criar solicitação
      const request = await prisma.purchaseRequest.create({
        data: {
          description,
          value,
          paymentDate: new Date(paymentDate),
          requesterArea,
          requesterPosition,
          creatorId: ctx.session.user.id,
        },
      });

      // Criar etapas de aprovação
      await createApprovalSteps(
        "PURCHASE",
        request.id,
        "purchaseRequestId",
        ctx.session.user.id,
        requesterAreaId
      );

      // Verificar se todas as etapas foram auto-aprovadas (CFO cria compra)
      const steps = await prisma.approvalStep.findMany({
        where: { purchaseRequestId: request.id },
      });

      const allApproved = steps.every((s) => s.status === "APPROVED");
      if (allApproved) {
        await prisma.purchaseRequest.update({
          where: { id: request.id },
          data: { status: "APPROVED" },
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
      const currentStep = await getCurrentPendingStep("PURCHASE", input.requestId);

      if (!currentStep) {
        return { canApprove: false, step: null };
      }

      const request = await prisma.purchaseRequest.findUnique({
        where: { id: input.requestId },
        include: { creator: { include: { areas: true } } },
      });

      const requestAreaId = request?.creator.areas[0]?.areaId;

      const canApprove = await canUserApproveStep(
        ctx.session.user.id,
        currentStep.role,
        requestAreaId
      );

      return { canApprove, step: currentStep };
    }),

  // Obter dados do usuário atual para pré-preencher formulário
  getCurrentUserData: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        position: true,
        areas: {
          include: { area: true },
        },
      },
    });

    if (!user) throw new Error("Usuário não encontrado");

    return {
      name: user.name,
      area: user.areas[0]?.area.name || "Sem área",
      position: user.position?.name || "Sem cargo",
    };
  }),
});
