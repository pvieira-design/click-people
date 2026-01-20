/**
 * Engine de Aprovação - Click People
 *
 * Fluxos de aprovação por módulo (hardcoded):
 * - Recesso/Férias: Dir. Área → Dir. RH → CEO
 * - Desligamento: Dir. Área → Dir. RH → CEO
 * - Contratação: Dir. Área → Dir. RH → CFO → CEO
 * - Solicitação de Compra: Dir. Área → CFO
 * - Mudança de Remuneração: Dir. Área → Dir. RH → CFO → CEO
 */

import prisma from "@click-people/db";

// Tipos de solicitação
export type RequestType =
  | "RECESS"
  | "TERMINATION"
  | "HIRING"
  | "PURCHASE"
  | "REMUNERATION";

// Roles de aprovação
export type ApprovalRole = "AREA_DIRECTOR" | "HR_DIRECTOR" | "CFO" | "CEO";

// Níveis hierárquicos
export const POSITION_LEVELS = {
  ANALYST: 10,
  MANAGER: 50,
  HEAD: 70,
  DIRECTOR: 80,
  HR_DIRECTOR: 90,
  CFO: 95,
  CEO: 100,
} as const;

// Definição dos fluxos por tipo de solicitação
export const APPROVAL_FLOWS: Record<RequestType, ApprovalRole[]> = {
  RECESS: ["AREA_DIRECTOR", "HR_DIRECTOR", "CEO"],
  TERMINATION: ["AREA_DIRECTOR", "HR_DIRECTOR", "CEO"],
  HIRING: ["AREA_DIRECTOR", "HR_DIRECTOR", "CFO", "CEO"],
  PURCHASE: ["AREA_DIRECTOR", "CFO"],
  REMUNERATION: ["AREA_DIRECTOR", "HR_DIRECTOR", "CFO", "CEO"],
};

// Mapeamento de role para nível mínimo
export const ROLE_MIN_LEVELS: Record<ApprovalRole, number> = {
  AREA_DIRECTOR: POSITION_LEVELS.DIRECTOR,
  HR_DIRECTOR: POSITION_LEVELS.HR_DIRECTOR,
  CFO: POSITION_LEVELS.CFO,
  CEO: POSITION_LEVELS.CEO,
};

// Labels para exibição
export const ROLE_LABELS: Record<ApprovalRole, string> = {
  AREA_DIRECTOR: "Diretor da Área",
  HR_DIRECTOR: "Diretor RH",
  CFO: "CFO",
  CEO: "CEO",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  RECESS: "Recesso/Férias",
  TERMINATION: "Desligamento",
  HIRING: "Contratação",
  PURCHASE: "Solicitação de Compra",
  REMUNERATION: "Mudança de Remuneração",
};

/**
 * Cria as etapas de aprovação para uma solicitação
 */
export async function createApprovalSteps(
  requestType: RequestType,
  requestId: string,
  requestField: string,
  creatorId: string,
  requestAreaId?: string
): Promise<void> {
  const flow = APPROVAL_FLOWS[requestType];

  // Buscar dados do criador
  const creator = await prisma.user.findUnique({
    where: { id: creatorId },
    include: {
      position: true,
      areas: {
        include: { area: true },
      },
    },
  });

  if (!creator) throw new Error("Criador não encontrado");

  const creatorLevel = creator.position?.level || 0;
  const creatorAreaIds = creator.areas.map((a) => a.areaId);
  const isCFO = creatorLevel >= POSITION_LEVELS.CFO;
  const isDirector = creatorLevel >= POSITION_LEVELS.DIRECTOR;
  const isCreatorAreaDirector = isDirector && requestAreaId && creatorAreaIds.includes(requestAreaId);

  // Auto-aprovação especial para CFO em compras
  if (requestType === "PURCHASE" && isCFO) {
    // Todas as etapas são auto-aprovadas
    for (let i = 0; i < flow.length; i++) {
      await prisma.approvalStep.create({
        data: {
          stepNumber: i + 1,
          role: flow[i],
          status: "APPROVED",
          approverId: creatorId,
          approvedAt: new Date(),
          comment: "Auto-aprovado (CFO)",
          [requestField]: requestId,
        },
      });
    }
    return;
  }

  // Criar etapas normais
  for (let i = 0; i < flow.length; i++) {
    const role = flow[i];
    const stepNumber = i + 1;

    // Verificar auto-aprovação da 1ª etapa (Diretor da própria área)
    const isFirstStep = stepNumber === 1;
    const shouldAutoApprove =
      isFirstStep &&
      role === "AREA_DIRECTOR" &&
      isCreatorAreaDirector;

    await prisma.approvalStep.create({
      data: {
        stepNumber,
        role,
        status: shouldAutoApprove ? "APPROVED" : "PENDING",
        approverId: shouldAutoApprove ? creatorId : null,
        approvedAt: shouldAutoApprove ? new Date() : null,
        comment: shouldAutoApprove ? "Auto-aprovado (Diretor da área)" : null,
        [requestField]: requestId,
      },
    });
  }
}

/**
 * Verifica se um usuário pode aprovar uma etapa específica
 */
export async function canUserApproveStep(
  userId: string,
  stepRole: ApprovalRole,
  requestAreaId?: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      position: true,
      areas: true,
    },
  });

  if (!user || !user.position) return false;

  const userLevel = user.position.level;
  const minLevel = ROLE_MIN_LEVELS[stepRole];

  // Verifica nível mínimo
  if (userLevel < minLevel) return false;

  // Para Diretor da Área, verifica se é da área correta
  if (stepRole === "AREA_DIRECTOR" && requestAreaId) {
    const userAreaIds = user.areas.map((a) => a.areaId);
    if (!userAreaIds.includes(requestAreaId)) return false;
  }

  // Admin pode tudo
  if (user.isAdmin) return true;

  // Verifica permissão de aprovar do cargo
  if (!user.position.canApprove) return false;

  return true;
}

/**
 * Processa aprovação de uma etapa
 */
export async function approveStep(
  stepId: string,
  approverId: string,
  comment?: string
): Promise<{ success: boolean; nextStep?: number; isFullyApproved: boolean }> {
  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: {
      recessRequest: true,
      terminationRequest: true,
      hiringRequest: true,
      purchaseRequest: true,
      remunerationRequest: true,
    },
  });

  if (!step) throw new Error("Etapa não encontrada");
  if (step.status !== "PENDING") throw new Error("Etapa já processada");

  // Determinar qual request está associado
  const requestAreaId = getRequestAreaId(step);

  // Verificar permissão
  const canApprove = await canUserApproveStep(approverId, step.role, requestAreaId);
  if (!canApprove) throw new Error("Sem permissão para aprovar esta etapa");

  // Aprovar etapa
  await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: "APPROVED",
      approverId,
      approvedAt: new Date(),
      comment,
    },
  });

  // Verificar se há próxima etapa pendente
  const requestId = getRequestId(step);
  const requestField = getRequestField(step);

  const nextPendingStep = await prisma.approvalStep.findFirst({
    where: {
      [requestField]: requestId,
      stepNumber: { gt: step.stepNumber },
      status: "PENDING",
    },
    orderBy: { stepNumber: "asc" },
  });

  // Se não há próxima etapa, a solicitação está totalmente aprovada
  const isFullyApproved = !nextPendingStep;

  if (isFullyApproved) {
    // Atualizar status da solicitação para APPROVED
    await updateRequestStatus(step, "APPROVED");
  }

  return {
    success: true,
    nextStep: nextPendingStep?.stepNumber,
    isFullyApproved,
  };
}

/**
 * Processa rejeição de uma etapa
 */
export async function rejectStep(
  stepId: string,
  approverId: string,
  comment: string
): Promise<void> {
  if (!comment || comment.trim().length < 3) {
    throw new Error("Comentário obrigatório para rejeição");
  }

  const step = await prisma.approvalStep.findUnique({
    where: { id: stepId },
    include: {
      recessRequest: true,
      terminationRequest: true,
      hiringRequest: true,
      purchaseRequest: true,
      remunerationRequest: true,
    },
  });

  if (!step) throw new Error("Etapa não encontrada");
  if (step.status !== "PENDING") throw new Error("Etapa já processada");

  // Determinar qual request está associado
  const requestAreaId = getRequestAreaId(step);

  // Verificar permissão
  const canApprove = await canUserApproveStep(approverId, step.role, requestAreaId);
  if (!canApprove) throw new Error("Sem permissão para rejeitar esta etapa");

  // Rejeitar etapa
  await prisma.approvalStep.update({
    where: { id: stepId },
    data: {
      status: "REJECTED",
      approverId,
      approvedAt: new Date(),
      comment,
    },
  });

  // Atualizar status da solicitação para REJECTED
  await updateRequestStatus(step, "REJECTED");
}

/**
 * Obtém a etapa atual pendente de uma solicitação
 */
export async function getCurrentPendingStep(
  requestType: RequestType,
  requestId: string
): Promise<any | null> {
  const requestField = getRequestFieldByType(requestType);

  return prisma.approvalStep.findFirst({
    where: {
      [requestField]: requestId,
      status: "PENDING",
    },
    orderBy: { stepNumber: "asc" },
    include: {
      approver: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Obtém todas as etapas de uma solicitação
 */
export async function getApprovalSteps(
  requestType: RequestType,
  requestId: string
): Promise<any[]> {
  const requestField = getRequestFieldByType(requestType);

  return prisma.approvalStep.findMany({
    where: {
      [requestField]: requestId,
    },
    orderBy: { stepNumber: "asc" },
    include: {
      approver: {
        select: { id: true, name: true },
      },
    },
  });
}

// Funções auxiliares
function getRequestAreaId(step: any): string | undefined {
  if (step.recessRequest) return step.recessRequest.providerArea;
  if (step.terminationRequest) return step.terminationRequest.providerArea;
  if (step.hiringRequest) return step.hiringRequest.areaId;
  if (step.purchaseRequest) return step.purchaseRequest.requesterArea;
  if (step.remunerationRequest) return step.remunerationRequest.providerArea;
  return undefined;
}

function getRequestId(step: any): string {
  return (
    step.recessRequestId ||
    step.terminationRequestId ||
    step.hiringRequestId ||
    step.purchaseRequestId ||
    step.remunerationRequestId
  );
}

function getRequestField(step: any): string {
  if (step.recessRequestId) return "recessRequestId";
  if (step.terminationRequestId) return "terminationRequestId";
  if (step.hiringRequestId) return "hiringRequestId";
  if (step.purchaseRequestId) return "purchaseRequestId";
  if (step.remunerationRequestId) return "remunerationRequestId";
  throw new Error("Tipo de solicitação não identificado");
}

function getRequestFieldByType(type: RequestType): string {
  const map: Record<RequestType, string> = {
    RECESS: "recessRequestId",
    TERMINATION: "terminationRequestId",
    HIRING: "hiringRequestId",
    PURCHASE: "purchaseRequestId",
    REMUNERATION: "remunerationRequestId",
  };
  return map[type];
}

async function updateRequestStatus(step: any, status: "APPROVED" | "REJECTED"): Promise<void> {
  if (step.recessRequestId) {
    await prisma.recessRequest.update({
      where: { id: step.recessRequestId },
      data: { status },
    });
  } else if (step.terminationRequestId) {
    await prisma.terminationRequest.update({
      where: { id: step.terminationRequestId },
      data: { status },
    });
    // Ação pós-aprovação: desativar prestador
    if (status === "APPROVED") {
      const request = await prisma.terminationRequest.findUnique({
        where: { id: step.terminationRequestId },
      });
      if (request) {
        await prisma.provider.update({
          where: { id: request.providerId },
          data: { isActive: false },
        });
      }
    }
  } else if (step.hiringRequestId) {
    await prisma.hiringRequest.update({
      where: { id: step.hiringRequestId },
      data: { status },
    });
  } else if (step.purchaseRequestId) {
    await prisma.purchaseRequest.update({
      where: { id: step.purchaseRequestId },
      data: { status },
    });
  } else if (step.remunerationRequestId) {
    await prisma.remunerationRequest.update({
      where: { id: step.remunerationRequestId },
      data: { status },
    });
    // Ação pós-aprovação: atualizar salário do prestador
    if (status === "APPROVED") {
      const request = await prisma.remunerationRequest.findUnique({
        where: { id: step.remunerationRequestId },
      });
      if (request) {
        await prisma.provider.update({
          where: { id: request.providerId },
          data: { salary: request.newSalary },
        });
      }
    }
  }
}
