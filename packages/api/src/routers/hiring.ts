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

export const hiringRouter = router({
  // Listar todas as solicitações de contratação
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
          hiringStatus: z.enum(["WAITING", "IN_PROGRESS", "HIRED"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { status, hiringStatus } = input || {};

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

      if (hiringStatus) {
        where.hiringStatus = hiringStatus;
      }

      // Se não for admin nem diretor, só pode ver suas próprias solicitações
      if (!isAdmin && !isDirector) {
        where.creatorId = ctx.session.user.id;
      }

      const requests = await prisma.hiringRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          creator: {
            select: { id: true, name: true },
          },
          replacedProvider: {
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
        hiringType: r.hiringType,
        hiringStatus: r.hiringStatus,
        area: r.area,
        position: r.position,
        proposedSalary: r.proposedSalary.toNumber(),
        expectedStartDate: r.expectedStartDate,
        priority: r.priority,
        reason: r.reason,
        hiredName: r.hiredName,
        actualStartDate: r.actualStartDate,
        createdAt: r.createdAt,
        creator: r.creator,
        replacedProvider: r.replacedProvider,
        approvalSteps: r.approvalSteps,
        currentStep: r.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: r.approvalSteps.length,
      }));
    }),

  // Obter uma solicitação específica
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      const request = await prisma.hiringRequest.findUnique({
        where: { id: input.id },
        include: {
          creator: {
            select: { id: true, name: true },
          },
          replacedProvider: {
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
        proposedSalary: request.proposedSalary.toNumber(),
        currentStep: request.approvalSteps.find((s) => s.status === "PENDING")?.stepNumber,
        totalSteps: request.approvalSteps.length,
      };
    }),

  // Criar nova solicitação de contratação
  create: protectedProcedure
    .input(
      z.object({
        hiringType: z.enum(["INCREASE", "REPLACEMENT"]),
        areaId: z.string(),
        positionId: z.string(),
        proposedSalary: z.number().positive(),
        expectedStartDate: z.string().or(z.date()),
        priority: z.enum(["HIGH", "MEDIUM", "LOW"]),
        reason: z.string().optional(),
        replacedProviderId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        hiringType,
        areaId,
        positionId,
        proposedSalary,
        expectedStartDate,
        priority,
        reason,
        replacedProviderId,
      } = input;

      // Buscar área e cargo
      const area = await prisma.area.findUnique({ where: { id: areaId } });
      const position = await prisma.position.findUnique({ where: { id: positionId } });

      if (!area) throw new Error("Área não encontrada");
      if (!position) throw new Error("Cargo não encontrado");

      // Validar substituição
      if (hiringType === "REPLACEMENT" && !replacedProviderId) {
        throw new Error("Selecione o prestador a ser substituído");
      }

      // Criar solicitação
      const request = await prisma.hiringRequest.create({
        data: {
          hiringType,
          areaId,
          area: area.name,
          positionId,
          position: position.name,
          proposedSalary,
          expectedStartDate: new Date(expectedStartDate),
          priority,
          reason,
          replacedProviderId,
          creatorId: ctx.session.user.id,
        },
      });

      // Criar etapas de aprovação
      await createApprovalSteps(
        "HIRING",
        request.id,
        "hiringRequestId",
        ctx.session.user.id,
        areaId
      );

      // Verificar se todas as etapas foram auto-aprovadas
      const steps = await prisma.approvalStep.findMany({
        where: { hiringRequestId: request.id },
      });

      const allApproved = steps.every((s) => s.status === "APPROVED");
      if (allApproved) {
        await prisma.hiringRequest.update({
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
      const currentStep = await getCurrentPendingStep("HIRING", input.requestId);

      if (!currentStep) {
        return { canApprove: false, step: null };
      }

      const request = await prisma.hiringRequest.findUnique({
        where: { id: input.requestId },
      });

      const canApprove = await canUserApproveStep(
        ctx.session.user.id,
        currentStep.role,
        request?.areaId
      );

      return { canApprove, step: currentStep };
    }),

  // Atualizar status de contratação (WAITING → IN_PROGRESS → HIRED)
  updateHiringStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        hiringStatus: z.enum(["WAITING", "IN_PROGRESS", "HIRED"]),
        hiredName: z.string().optional(),
        actualStartDate: z.string().or(z.date()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, hiringStatus, hiredName, actualStartDate } = input;

      // Verificar permissão (admin ou RH)
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
        include: { position: true },
      });

      const isAdmin = currentUser?.isAdmin;
      const isHRDirector = currentUser?.position?.level === 90;

      if (!isAdmin && !isHRDirector) {
        throw new Error("Acesso negado. Apenas Admin ou Diretor RH podem atualizar status de contratação.");
      }

      const request = await prisma.hiringRequest.findUnique({
        where: { id },
      });

      if (!request) throw new Error("Solicitação não encontrada");
      if (request.status !== "APPROVED") {
        throw new Error("Solicitação deve estar aprovada para atualizar status de contratação");
      }

      // Validar transição de status
      if (hiringStatus === "HIRED") {
        if (!hiredName) throw new Error("Nome do contratado é obrigatório");
        if (!actualStartDate) throw new Error("Data de início é obrigatória");
      }

      const updatedRequest = await prisma.hiringRequest.update({
        where: { id },
        data: {
          hiringStatus,
          hiredName,
          actualStartDate: actualStartDate ? new Date(actualStartDate) : undefined,
        },
      });

      // Se contratado, criar o prestador
      if (hiringStatus === "HIRED" && hiredName && actualStartDate) {
        await prisma.provider.create({
          data: {
            name: hiredName,
            areaId: request.areaId,
            positionId: request.positionId,
            salary: request.proposedSalary,
            startDate: new Date(actualStartDate),
          },
        });
      }

      return updatedRequest;
    }),

  // Listar áreas para seleção
  listAreas: protectedProcedure.query(async () => {
    return prisma.area.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
  }),

  // Listar cargos para seleção
  listPositions: protectedProcedure.query(async () => {
    return prisma.position.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, level: true },
    });
  }),

  // Listar prestadores ativos para substituição
  listProvidersForReplacement: protectedProcedure
    .input(z.object({ areaId: z.string().optional() }))
    .query(async ({ input }) => {
      const where: any = { isActive: true };
      if (input.areaId) {
        where.areaId = input.areaId;
      }

      return prisma.provider.findMany({
        where,
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          area: { select: { id: true, name: true } },
          position: { select: { id: true, name: true } },
        },
      });
    }),
});
