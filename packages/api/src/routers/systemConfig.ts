import { z } from "zod";

import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

// Tipos de solicitação
export type RequestType =
  | "RECESS"
  | "TERMINATION"
  | "HIRING"
  | "PURCHASE"
  | "REMUNERATION";

// Schema para validação dos fluxos de aprovação
const ApprovalFlowStepSchema = z.string().min(1);

const SingleFlowSchema = z.object({
  enabled: z.boolean(),
  steps: z.array(ApprovalFlowStepSchema).min(2),
});

const ApprovalFlowsSchema = z.object({
  version: z.number(),
  lastUpdatedAt: z.string(),
  lastUpdatedBy: z.string(),
  flows: z.object({
    RECESS: SingleFlowSchema,
    TERMINATION: SingleFlowSchema,
    HIRING: SingleFlowSchema,
    PURCHASE: SingleFlowSchema,
    REMUNERATION: SingleFlowSchema,
  }),
});

export type ApprovalFlowsConfig = z.infer<typeof ApprovalFlowsSchema>;

// Configuração padrão dos fluxos de aprovação
export const DEFAULT_APPROVAL_FLOWS: ApprovalFlowsConfig = {
  version: 1,
  lastUpdatedAt: new Date().toISOString(),
  lastUpdatedBy: "system",
  flows: {
    RECESS: {
      enabled: true,
      steps: ["REQUEST_AREA", "RH", "Diretoria"],
    },
    TERMINATION: {
      enabled: true,
      steps: ["REQUEST_AREA", "RH", "Diretoria"],
    },
    HIRING: {
      enabled: true,
      steps: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
    },
    PURCHASE: {
      enabled: true,
      steps: ["REQUEST_AREA", "Financeiro"],
    },
    REMUNERATION: {
      enabled: true,
      steps: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
    },
  },
};

// Labels para os tipos de solicitação
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  RECESS: "Recesso/Férias",
  TERMINATION: "Desligamento",
  HIRING: "Contratação",
  PURCHASE: "Solicitação de Compra",
  REMUNERATION: "Mudança de Remuneração",
};

export const systemConfigRouter = router({
  // Buscar os fluxos de aprovação configurados
  getApprovalFlows: protectedProcedure.query(async () => {
    const config = await prisma.systemConfig.findUnique({
      where: { key: "APPROVAL_FLOWS" },
    });

    if (!config) {
      return DEFAULT_APPROVAL_FLOWS;
    }

    try {
      const parsed = ApprovalFlowsSchema.parse(config.value);
      return parsed;
    } catch {
      // Se a configuração for inválida, retornar o padrão
      return DEFAULT_APPROVAL_FLOWS;
    }
  }),

  // Atualizar os fluxos de aprovação (apenas admin)
  updateApprovalFlows: protectedProcedure
    .input(
      z.object({
        flows: z.object({
          RECESS: SingleFlowSchema,
          TERMINATION: SingleFlowSchema,
          HIRING: SingleFlowSchema,
          PURCHASE: SingleFlowSchema,
          REMUNERATION: SingleFlowSchema,
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUser = await prisma.user.findUnique({
        where: { id: ctx.session.user.id },
      });

      if (!currentUser?.isAdmin) {
        throw new Error("Acesso negado");
      }

      // Validar que todas as áreas existem (exceto REQUEST_AREA)
      const allSteps = Object.values(input.flows).flatMap((flow) => flow.steps);
      const uniqueAreas = [...new Set(allSteps.filter((s) => s !== "REQUEST_AREA"))];

      const existingAreas = await prisma.area.findMany({
        where: { name: { in: uniqueAreas } },
        select: { name: true },
      });

      const existingAreaNames = new Set(existingAreas.map((a) => a.name));
      const invalidAreas = uniqueAreas.filter((a) => !existingAreaNames.has(a));

      if (invalidAreas.length > 0) {
        throw new Error(`Áreas não encontradas: ${invalidAreas.join(", ")}`);
      }

      // Validar que a primeira etapa é sempre REQUEST_AREA
      for (const [type, flow] of Object.entries(input.flows)) {
        if (flow.steps[0] !== "REQUEST_AREA") {
          throw new Error(
            `A primeira etapa de ${REQUEST_TYPE_LABELS[type as RequestType]} deve ser "Área da Solicitação"`
          );
        }

        // Validar que não há duplicatas consecutivas
        for (let i = 1; i < flow.steps.length; i++) {
          if (flow.steps[i] === flow.steps[i - 1]) {
            throw new Error(
              `${REQUEST_TYPE_LABELS[type as RequestType]} não pode ter etapas duplicadas consecutivas`
            );
          }
        }
      }

      const newConfig: ApprovalFlowsConfig = {
        version: 1,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: currentUser.id,
        flows: input.flows,
      };

      await prisma.systemConfig.upsert({
        where: { key: "APPROVAL_FLOWS" },
        update: { value: newConfig },
        create: { key: "APPROVAL_FLOWS", value: newConfig },
      });

      return newConfig;
    }),

  // Listar áreas disponíveis para configurar nos fluxos
  getConfigurableAreas: protectedProcedure.query(async () => {
    const areas = await prisma.area.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        director: {
          select: { id: true, name: true },
        },
        cLevel: {
          select: { id: true, name: true },
        },
      },
    });

    // Adicionar a opção "Área da Solicitação" no início
    return [
      {
        id: "REQUEST_AREA",
        name: "Área da Solicitação",
        description: "A área do prestador/solicitante",
        director: null,
        cLevel: null,
      },
      ...areas.map((area) => ({
        id: area.name, // Usamos o nome como ID para compatibilidade com o fluxo
        name: area.name,
        description: area.director?.name
          ? `Responsável: ${area.director.name}`
          : area.cLevel?.name
            ? `C-Level: ${area.cLevel.name}`
            : "Sem responsável definido",
        director: area.director,
        cLevel: area.cLevel,
      })),
    ];
  }),

  // Restaurar fluxos para o padrão
  resetApprovalFlows: protectedProcedure.mutation(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado");
    }

    const defaultConfig: ApprovalFlowsConfig = {
      ...DEFAULT_APPROVAL_FLOWS,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: currentUser.id,
    };

    await prisma.systemConfig.upsert({
      where: { key: "APPROVAL_FLOWS" },
      update: { value: defaultConfig },
      create: { key: "APPROVAL_FLOWS", value: defaultConfig },
    });

    return defaultConfig;
  }),
});
