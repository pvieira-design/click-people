/**
 * Engine de Aprovação - Click People
 *
 * Sistema simplificado baseado em ÁREAS:
 * - Cada etapa de aprovação é responsabilidade de uma ÁREA específica
 * - Quem pode aprovar: Diretor ou C-Level DESIGNADO da área
 *
 * Fluxos de aprovação são configuráveis via SystemConfig (APPROVAL_FLOWS)
 * Padrão se não configurado:
 * - Recesso/Férias: Área do Request → RH → Diretoria
 * - Desligamento: Área do Request → RH → Diretoria
 * - Contratação: Área do Request → RH → Financeiro → Diretoria
 * - Solicitação de Compra: Área do Request → Financeiro
 * - Mudança de Remuneração: Área do Request → RH → Financeiro → Diretoria
 */

import prisma from "@click-people/db";

// Tipos de solicitação
export type RequestType =
  | "RECESS"
  | "TERMINATION"
  | "HIRING"
  | "PURCHASE"
  | "REMUNERATION";

// Roles de aprovação (DEPRECATED - mantido para compatibilidade com dados existentes)
export type ApprovalRole = "AREA_DIRECTOR" | "HR_DIRECTOR" | "CFO" | "CEO" | "PARTNER";

// Identificadores de área para fluxos de aprovação
// "REQUEST_AREA" = área do prestador/solicitante
// Outros = nomes de áreas específicas no banco
export type ApprovalAreaIdentifier = "REQUEST_AREA" | string;

// Definição dos fluxos padrão por tipo de solicitação (baseado em áreas)
export const DEFAULT_APPROVAL_FLOWS: Record<RequestType, ApprovalAreaIdentifier[]> = {
  RECESS: ["REQUEST_AREA", "RH", "Diretoria"],
  TERMINATION: ["REQUEST_AREA", "RH", "Diretoria"],
  HIRING: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
  PURCHASE: ["REQUEST_AREA", "Financeiro"],
  REMUNERATION: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
};

// Labels para exibição (DEPRECATED - mantido para compatibilidade)
export const ROLE_LABELS: Record<ApprovalRole, string> = {
  AREA_DIRECTOR: "Diretor da Área",
  HR_DIRECTOR: "Diretor RH",
  CFO: "CFO",
  CEO: "CEO",
  PARTNER: "Sócio",
};

export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  RECESS: "Recesso/Férias",
  TERMINATION: "Desligamento",
  HIRING: "Contratação",
  PURCHASE: "Solicitação de Compra",
  REMUNERATION: "Mudança de Remuneração",
};

// Níveis hierárquicos simplificados
// O cargo (Position) define a função específica (CFO, CEO, etc.)
// O nível hierárquico define a senioridade para aprovações
export const HIERARCHY_LEVELS = {
  JUNIOR: 10,
  MID: 20,
  SENIOR: 30,
  SPECIALIST: 35,
  COORDINATOR: 40,
  MANAGER: 50,
  HEAD: 70,
  DIRECTOR: 80,   // Diretoria
  C_LEVEL: 90,    // C-level (CFO, CEO, COO, etc. - definido pelo cargo)
  VP: 105,        // Vice Presidente
  PARTNER: 110,   // Sócio
} as const;

// Mapeamento de role para nível mínimo (simplificado)
export const ROLE_MIN_LEVELS: Record<ApprovalRole, number> = {
  AREA_DIRECTOR: HIERARCHY_LEVELS.DIRECTOR,
  HR_DIRECTOR: HIERARCHY_LEVELS.C_LEVEL,
  CFO: HIERARCHY_LEVELS.C_LEVEL,
  CEO: HIERARCHY_LEVELS.C_LEVEL,
  PARTNER: HIERARCHY_LEVELS.PARTNER,
};

/**
 * Busca os fluxos de aprovação configurados no banco
 * Retorna o padrão se não houver configuração
 */
async function getApprovalFlows(): Promise<Record<RequestType, ApprovalAreaIdentifier[]>> {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "APPROVAL_FLOWS" },
    });

    if (!config) {
      return DEFAULT_APPROVAL_FLOWS;
    }

    const value = config.value as {
      flows?: Record<RequestType, { enabled: boolean; steps: string[] }>;
    };

    if (!value?.flows) {
      return DEFAULT_APPROVAL_FLOWS;
    }

    // Converter do formato de config para o formato usado internamente
    const flows: Record<RequestType, ApprovalAreaIdentifier[]> = {
      RECESS: value.flows.RECESS?.steps || DEFAULT_APPROVAL_FLOWS.RECESS,
      TERMINATION: value.flows.TERMINATION?.steps || DEFAULT_APPROVAL_FLOWS.TERMINATION,
      HIRING: value.flows.HIRING?.steps || DEFAULT_APPROVAL_FLOWS.HIRING,
      PURCHASE: value.flows.PURCHASE?.steps || DEFAULT_APPROVAL_FLOWS.PURCHASE,
      REMUNERATION: value.flows.REMUNERATION?.steps || DEFAULT_APPROVAL_FLOWS.REMUNERATION,
    };

    return flows;
  } catch {
    return DEFAULT_APPROVAL_FLOWS;
  }
}

/**
 * Busca a área pelo nome
 */
async function getAreaByName(name: string): Promise<{ id: string; name: string } | null> {
  return prisma.area.findUnique({
    where: { name },
    select: { id: true, name: true },
  });
}

/**
 * Mapeia o identificador da área para um role legado (para compatibilidade)
 */
function getDefaultRole(areaIdentifier: ApprovalAreaIdentifier, stepNumber: number): ApprovalRole {
  if (areaIdentifier === "REQUEST_AREA") return "AREA_DIRECTOR";
  if (areaIdentifier === "RH") return "HR_DIRECTOR";
  if (areaIdentifier === "Financeiro") return "CFO";
  if (areaIdentifier === "Diretoria") return "PARTNER";
  return "AREA_DIRECTOR";
}

/**
 * Cria as etapas de aprovação para uma solicitação
 * NOTA: Auto-aprovação foi removida - todas as etapas requerem aprovação manual
 */
export async function createApprovalSteps(
  requestType: RequestType,
  requestId: string,
  requestField: string,
  creatorId: string,
  requestAreaId?: string
): Promise<void> {
  // Buscar fluxos configurados do banco
  const flows = await getApprovalFlows();
  const flow = flows[requestType];

  // Criar etapas - todas começam como PENDING (sem auto-aprovação)
  for (let i = 0; i < flow.length; i++) {
    const areaIdentifier = flow[i];
    const stepNumber = i + 1;

    // Determinar a área de aprovação
    let approvalAreaId: string | null = null;
    if (areaIdentifier === "REQUEST_AREA") {
      approvalAreaId = requestAreaId || null;
    } else {
      const area = await getAreaByName(areaIdentifier);
      approvalAreaId = area?.id || null;
    }

    await prisma.approvalStep.create({
      data: {
        stepNumber,
        role: getDefaultRole(areaIdentifier, stepNumber),
        approvalAreaId,
        status: "PENDING",
        approverId: null,
        approvedAt: null,
        comment: null,
        [requestField]: requestId,
      },
    });
  }
}

/**
 * Resultado da verificação de permissão de aprovação
 */
export interface ApprovalPermissionResult {
  canApprove: boolean;
  isDesignatedApprover: boolean;
  isAdminOverride: boolean;
}

/**
 * Verifica se um usuário pode aprovar uma etapa específica
 * NOVO: Baseado em áreas - o usuário precisa ser Diretor ou C-Level DESIGNADO da área
 * Retorna também se é um admin override (admin aprovando sem ser o aprovador designado)
 */
export async function canUserApproveStep(
  userId: string,
  stepRole: ApprovalRole,
  requestAreaId?: string,
  approvalAreaId?: string
): Promise<boolean> {
  const result = await checkApprovalPermission(userId, stepRole, requestAreaId, approvalAreaId);
  return result.canApprove;
}

/**
 * Verifica permissões de aprovação com detalhes
 * Retorna se pode aprovar, se é o aprovador designado, e se é admin override
 */
export async function checkApprovalPermission(
  userId: string,
  stepRole: ApprovalRole,
  requestAreaId?: string,
  approvalAreaId?: string
): Promise<ApprovalPermissionResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      hierarchyLevel: true,
      area: true,
      cLevelOfAreas: true,
      directorOfAreas: true,
    },
  });

  if (!user) {
    return { canApprove: false, isDesignatedApprover: false, isAdminOverride: false };
  }

  // Determinar qual área precisa aprovar
  const targetAreaId = approvalAreaId || requestAreaId;

  // Verificar se o usuário é o diretor ou C-Level DESIGNADO da área de aprovação
  let isDesignatedApprover = false;
  if (targetAreaId) {
    const isDesignatedDirector = user.directorOfAreas.some((area) => area.id === targetAreaId);
    const isDesignatedCLevel = user.cLevelOfAreas.some((area) => area.id === targetAreaId);
    isDesignatedApprover = isDesignatedDirector || isDesignatedCLevel;
  }

  // Se é o aprovador designado, pode aprovar normalmente
  if (isDesignatedApprover) {
    return { canApprove: true, isDesignatedApprover: true, isAdminOverride: false };
  }

  // Se é admin mas não é o aprovador designado, é admin override
  if (user.isAdmin) {
    return { canApprove: true, isDesignatedApprover: false, isAdminOverride: true };
  }

  // Não pode aprovar
  return { canApprove: false, isDesignatedApprover: false, isAdminOverride: false };
}

/**
 * Obtém todos os usuários que podem aprovar uma etapa específica
 * NOVO: Retorna Diretor + C-Level da área de aprovação
 */
export async function getPotentialApprovers(
  stepRole: ApprovalRole,
  requestAreaId?: string,
  approvalAreaId?: string
): Promise<Array<{ id: string; name: string; email: string }>> {
  // Determinar qual área precisa aprovar
  const targetAreaId = approvalAreaId || requestAreaId;
  if (!targetAreaId) return [];

  // Buscar a área com seu diretor e C-Level designados
  const area = await prisma.area.findUnique({
    where: { id: targetAreaId },
    include: {
      director: {
        select: { id: true, name: true, email: true },
      },
      cLevel: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!area) return [];

  const approvers: Array<{ id: string; name: string; email: string }> = [];
  if (area.director) approvers.push(area.director);
  if (area.cLevel && area.cLevel.id !== area.director?.id) {
    approvers.push(area.cLevel);
  }

  return approvers;
}

/**
 * Obtém o aprovador designado para uma etapa
 * Retorna null se não houver aprovador configurado
 */
export async function getDesignatedApprover(
  stepRole: ApprovalRole,
  requestAreaId?: string,
  approvalAreaId?: string
): Promise<{ id: string; name: string; email: string } | null> {
  // Determinar qual área precisa aprovar
  const targetAreaId = approvalAreaId || requestAreaId;
  if (!targetAreaId) return null;

  // Buscar a área com seu diretor e C-Level
  const area = await prisma.area.findUnique({
    where: { id: targetAreaId },
    include: {
      director: {
        select: { id: true, name: true, email: true },
      },
      cLevel: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  // Retorna o diretor, ou o C-Level se não houver diretor
  return area?.director || area?.cLevel || null;
}

/**
 * Obtém o nome da área de aprovação para exibição
 */
export async function getApprovalAreaName(approvalAreaId: string | null): Promise<string> {
  if (!approvalAreaId) return "Área não definida";

  const area = await prisma.area.findUnique({
    where: { id: approvalAreaId },
    select: { name: true },
  });

  return area?.name || "Área não encontrada";
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
      approvalArea: true,
      recessRequest: {
        include: { provider: { select: { areaId: true } } },
      },
      terminationRequest: {
        include: { provider: { select: { areaId: true } } },
      },
      hiringRequest: true,
      purchaseRequest: {
        include: { creator: { select: { areaId: true } } },
      },
      remunerationRequest: {
        include: { provider: { select: { areaId: true } } },
      },
    },
  });

  if (!step) throw new Error("Etapa não encontrada");
  if (step.status !== "PENDING") throw new Error("Etapa já processada");

  // Determinar qual request está associado
  const requestAreaId = getRequestAreaId(step);

  // Verificar permissão (usando a área de aprovação da etapa)
  const canApprove = await canUserApproveStep(
    approverId,
    step.role,
    requestAreaId,
    step.approvalAreaId || undefined
  );
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
      approvalArea: true,
      recessRequest: {
        include: { provider: { select: { areaId: true } } },
      },
      terminationRequest: {
        include: { provider: { select: { areaId: true } } },
      },
      hiringRequest: true,
      purchaseRequest: {
        include: { creator: { select: { areaId: true } } },
      },
      remunerationRequest: {
        include: { provider: { select: { areaId: true } } },
      },
    },
  });

  if (!step) throw new Error("Etapa não encontrada");
  if (step.status !== "PENDING") throw new Error("Etapa já processada");

  // Determinar qual request está associado
  const requestAreaId = getRequestAreaId(step);

  // Verificar permissão (usando a área de aprovação da etapa)
  const canApprove = await canUserApproveStep(
    approverId,
    step.role,
    requestAreaId,
    step.approvalAreaId || undefined
  );
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
      approvalArea: true,
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
      approvalArea: true,
      approver: {
        select: { id: true, name: true },
      },
    },
  });
}

/**
 * Retorna os IDs das áreas onde o usuário é aprovador designado (diretor ou C-level)
 */
export async function getUserApprovalAreaIds(userId: string): Promise<string[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      directorOfAreas: { select: { id: true } },
      cLevelOfAreas: { select: { id: true } },
    },
  });

  if (!user) return [];

  const areaIds = new Set<string>();
  user.directorOfAreas.forEach((area) => areaIds.add(area.id));
  user.cLevelOfAreas.forEach((area) => areaIds.add(area.id));

  return Array.from(areaIds);
}

/**
 * Verifica se o usuário é admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { isAdmin: true },
  });
  return user?.isAdmin ?? false;
}

// Funções auxiliares
function getRequestAreaId(step: any): string | undefined {
  if (step.recessRequest) return step.recessRequest.provider?.areaId;
  if (step.terminationRequest) return step.terminationRequest.provider?.areaId;
  if (step.hiringRequest) return step.hiringRequest.areaId;
  if (step.purchaseRequest) return step.purchaseRequest.creator?.areaId;
  if (step.remunerationRequest) return step.remunerationRequest.provider?.areaId;
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
