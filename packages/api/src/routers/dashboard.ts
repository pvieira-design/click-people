import prisma from "@click-people/db";

import { protectedProcedure, router } from "../index";

// Percentuais de bonus por tier
const BONUS_PERCENTAGES = {
  NONE: 0,
  BRONZE: 0.1,
  SILVER: 0.15,
  GOLD: 0.2,
} as const;

export const dashboardRouter = router({
  // ==================== ADMIN DASHBOARD ====================

  // Dados completos para o dashboard admin
  getAdminStats: protectedProcedure.query(async ({ ctx }) => {
    // Verificar se e admin
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado. Apenas administradores.");
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.setHours(0, 0, 0, 0));

    // Buscar dados em paralelo
    const [
      // Usuarios
      pendingUsers,
      activeUsers,
      totalUsers,
      // Prestadores
      activeProviders,
      totalProviders,
      // Documentos pendentes
      pendingDocs,
      // Folha
      salaryData,
      // Solicitacoes do mes
      monthlyRequests,
      // Logs de hoje
      todayLogs,
      // Ultimos logs
      recentLogs,
      // Contratacoes em andamento
      hiringInProgress,
    ] = await Promise.all([
      // Usuarios pendentes
      prisma.user.count({ where: { status: "PENDING" } }),
      // Usuarios ativos
      prisma.user.count({ where: { status: "ACTIVE" } }),
      // Total usuarios
      prisma.user.count(),
      // Prestadores ativos
      prisma.provider.count({ where: { isActive: true } }),
      // Total prestadores
      prisma.provider.count(),
      // Documentos pendentes (NDA ou Contrato nao assinados)
      prisma.provider.count({
        where: {
          isActive: true,
          OR: [{ ndaStatus: "NOT_SIGNED" }, { contractStatus: "NOT_SIGNED" }],
        },
      }),
      // Soma dos salarios
      prisma.provider.aggregate({
        where: { isActive: true },
        _sum: { salary: true },
      }),
      // Solicitacoes do mes
      Promise.all([
        prisma.recessRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.terminationRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.hiringRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.purchaseRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        prisma.remunerationRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
        // Aprovadas no mes
        prisma.recessRequest.count({
          where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.terminationRequest.count({
          where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.hiringRequest.count({
          where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.purchaseRequest.count({
          where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.remunerationRequest.count({
          where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
        }),
        // Rejeitadas no mes
        prisma.recessRequest.count({
          where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.terminationRequest.count({
          where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.hiringRequest.count({
          where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.purchaseRequest.count({
          where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
        }),
        prisma.remunerationRequest.count({
          where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
        }),
      ]),
      // Logs de hoje
      prisma.auditLog.count({ where: { createdAt: { gte: startOfToday } } }),
      // Ultimos 10 logs
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true } },
        },
      }),
      // Contratacoes em andamento
      prisma.hiringRequest.count({
        where: { status: "APPROVED", hiringStatus: "IN_PROGRESS" },
      }),
    ]);

    // Calcular solicitacoes paradas (pendentes ha mais de 7 dias)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const stalledRequests = await Promise.all([
      prisma.recessRequest.count({
        where: { status: "PENDING", updatedAt: { lt: sevenDaysAgo } },
      }),
      prisma.terminationRequest.count({
        where: { status: "PENDING", updatedAt: { lt: sevenDaysAgo } },
      }),
      prisma.hiringRequest.count({
        where: { status: "PENDING", updatedAt: { lt: sevenDaysAgo } },
      }),
      prisma.purchaseRequest.count({
        where: { status: "PENDING", updatedAt: { lt: sevenDaysAgo } },
      }),
      prisma.remunerationRequest.count({
        where: { status: "PENDING", updatedAt: { lt: sevenDaysAgo } },
      }),
    ]);

    const totalStalled = stalledRequests.reduce((a, b) => a + b, 0);

    // Calcular totais do mes
    const [
      recessCreated,
      termCreated,
      hiringCreated,
      purchaseCreated,
      remunCreated,
      recessApproved,
      termApproved,
      hiringApproved,
      purchaseApproved,
      remunApproved,
      recessRejected,
      termRejected,
      hiringRejected,
      purchaseRejected,
      remunRejected,
    ] = monthlyRequests;

    const totalCreated =
      recessCreated + termCreated + hiringCreated + purchaseCreated + remunCreated;
    const totalApproved =
      recessApproved + termApproved + hiringApproved + purchaseApproved + remunApproved;
    const totalRejected =
      recessRejected + termRejected + hiringRejected + purchaseRejected + remunRejected;

    // Valor de compras aprovadas no mes
    const approvedPurchases = await prisma.purchaseRequest.aggregate({
      where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
      _sum: { value: true },
    });

    return {
      alerts: {
        pendingUsers,
        stalledRequests: totalStalled,
        pendingDocs,
      },
      system: {
        users: { active: activeUsers, total: totalUsers },
        providers: { active: activeProviders, total: totalProviders },
        totalSalary: salaryData._sum.salary?.toNumber() || 0,
        todayActions: todayLogs,
      },
      monthly: {
        created: totalCreated,
        approved: totalApproved,
        rejected: totalRejected,
        hiringApproved: hiringApproved,
        hiringInProgress,
        terminationsApproved: termApproved,
        purchasesApproved: approvedPurchases._sum.value?.toNumber() || 0,
      },
      recentLogs: recentLogs.map((log) => ({
        id: log.id,
        action: log.action,
        entityType: log.entityType,
        userName: log.user?.name || "Sistema",
        createdAt: log.createdAt,
      })),
    };
  }),

  // ==================== GENERAL DASHBOARD ====================

  // Dados para o dashboard geral (adaptativo por role)
  getGeneralStats: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      include: {
        position: true,
        areas: { include: { area: true } },
      },
    });

    if (!currentUser) {
      throw new Error("Usuario nao encontrado");
    }

    const userLevel = currentUser.position?.level || 0;
    const userAreaIds = currentUser.areas.map((ua) => ua.areaId);
    const canApprove = currentUser.position?.canApprove || false;
    const isAdmin = currentUser.isAdmin;
    const isDirector = userLevel >= 80;
    const isHRDirector = userLevel >= 90;
    const isCLevel = userLevel >= 95; // CFO ou CEO

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Dados basicos para todos
    const [activeProviders, totalSalary] = await Promise.all([
      prisma.provider.count({ where: { isActive: true } }),
      prisma.provider.aggregate({
        where: { isActive: true },
        _sum: { salary: true },
      }),
    ]);

    // Dados de pendencias para aprovadores
    let pendingCounts = { recess: 0, termination: 0, hiring: 0, purchase: 0, remuneration: 0 };

    if (canApprove || isAdmin) {
      // Niveis minimos por role
      const ROLE_MIN_LEVELS = {
        AREA_DIRECTOR: 80,
        HR_DIRECTOR: 90,
        CFO: 95,
        CEO: 100,
      } as const;

      // Buscar todas as etapas pendentes
      const pendingSteps = await prisma.approvalStep.findMany({
        where: { status: "PENDING" },
        include: {
          recessRequest: { select: { id: true, providerArea: true, status: true } },
          terminationRequest: { select: { id: true, providerArea: true, status: true } },
          hiringRequest: { select: { id: true, areaId: true, status: true } },
          purchaseRequest: { select: { id: true, requesterArea: true, status: true } },
          remunerationRequest: { select: { id: true, providerArea: true, status: true } },
        },
      });

      for (const step of pendingSteps) {
        const minLevel = ROLE_MIN_LEVELS[step.role as keyof typeof ROLE_MIN_LEVELS];
        if (!minLevel || userLevel < minLevel) continue;

        // Verificar area para AREA_DIRECTOR
        if (step.role === "AREA_DIRECTOR" && !isAdmin) {
          let requestAreaId: string | undefined;
          if (step.recessRequest) requestAreaId = step.recessRequest.providerArea;
          else if (step.terminationRequest) requestAreaId = step.terminationRequest.providerArea;
          else if (step.hiringRequest) requestAreaId = step.hiringRequest.areaId;
          else if (step.purchaseRequest) requestAreaId = step.purchaseRequest.requesterArea;
          else if (step.remunerationRequest) requestAreaId = step.remunerationRequest.providerArea;

          if (requestAreaId && !userAreaIds.includes(requestAreaId)) continue;
        }

        // Contar por tipo
        if (step.recessRequest && step.recessRequest.status === "PENDING") {
          pendingCounts.recess++;
        } else if (step.terminationRequest && step.terminationRequest.status === "PENDING") {
          pendingCounts.termination++;
        } else if (step.hiringRequest && step.hiringRequest.status === "PENDING") {
          pendingCounts.hiring++;
        } else if (step.purchaseRequest && step.purchaseRequest.status === "PENDING") {
          pendingCounts.purchase++;
        } else if (step.remunerationRequest && step.remunerationRequest.status === "PENDING") {
          pendingCounts.remuneration++;
        }
      }
    }

    // Solicitacoes criadas pelo usuario (se for diretor+)
    let myRequests: Array<{
      id: string;
      type: string;
      description: string;
      status: string;
      currentStep?: string;
      createdAt: Date;
    }> = [];

    if (isDirector) {
      const [recess, termination, hiring, purchase, remuneration] = await Promise.all([
        prisma.recessRequest.findMany({
          where: { creatorId: currentUser.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            provider: { select: { name: true } },
            approvalSteps: { where: { status: "PENDING" }, take: 1 },
          },
        }),
        prisma.terminationRequest.findMany({
          where: { creatorId: currentUser.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            provider: { select: { name: true } },
            approvalSteps: { where: { status: "PENDING" }, take: 1 },
          },
        }),
        prisma.hiringRequest.findMany({
          where: { creatorId: currentUser.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            approvalSteps: { where: { status: "PENDING" }, take: 1 },
          },
        }),
        prisma.purchaseRequest.findMany({
          where: { creatorId: currentUser.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            approvalSteps: { where: { status: "PENDING" }, take: 1 },
          },
        }),
        prisma.remunerationRequest.findMany({
          where: { creatorId: currentUser.id },
          take: 3,
          orderBy: { createdAt: "desc" },
          include: {
            provider: { select: { name: true } },
            approvalSteps: { where: { status: "PENDING" }, take: 1 },
          },
        }),
      ]);

      const ROLE_LABELS: Record<string, string> = {
        AREA_DIRECTOR: "Dir. Area",
        HR_DIRECTOR: "Dir. RH",
        CFO: "CFO",
        CEO: "CEO",
      };

      myRequests = [
        ...recess.map((r) => ({
          id: r.id,
          type: "recess",
          description: `Recesso - ${r.provider.name}`,
          status: r.status,
          currentStep: r.approvalSteps[0]?.role
            ? ROLE_LABELS[r.approvalSteps[0].role]
            : undefined,
          createdAt: r.createdAt,
        })),
        ...termination.map((r) => ({
          id: r.id,
          type: "termination",
          description: `Desligamento - ${r.provider.name}`,
          status: r.status,
          currentStep: r.approvalSteps[0]?.role
            ? ROLE_LABELS[r.approvalSteps[0].role]
            : undefined,
          createdAt: r.createdAt,
        })),
        ...hiring.map((r) => ({
          id: r.id,
          type: "hiring",
          description: `Contratacao - ${r.position}`,
          status: r.status,
          currentStep: r.approvalSteps[0]?.role
            ? ROLE_LABELS[r.approvalSteps[0].role]
            : undefined,
          createdAt: r.createdAt,
        })),
        ...purchase.map((r) => ({
          id: r.id,
          type: "purchase",
          description: `Compra - ${r.description}`,
          status: r.status,
          currentStep: r.approvalSteps[0]?.role
            ? ROLE_LABELS[r.approvalSteps[0].role]
            : undefined,
          createdAt: r.createdAt,
        })),
        ...remuneration.map((r) => ({
          id: r.id,
          type: "remuneration",
          description: `Remuneracao - ${r.provider.name}`,
          status: r.status,
          currentStep: r.approvalSteps[0]?.role
            ? ROLE_LABELS[r.approvalSteps[0].role]
            : undefined,
          createdAt: r.createdAt,
        })),
      ]
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);
    }

    // Dados das areas do usuario
    let userAreas: Array<{
      id: string;
      name: string;
      providerCount: number;
      totalSalary: number;
      upcomingRecess: Array<{ name: string; startDate: Date; endDate: Date }>;
    }> = [];

    if (userAreaIds.length > 0 || isCLevel || isAdmin) {
      const areasToFetch = isCLevel || isAdmin ? undefined : userAreaIds;

      const areas = await prisma.area.findMany({
        where: areasToFetch ? { id: { in: areasToFetch } } : undefined,
        include: {
          providers: {
            where: { isActive: true },
            select: { id: true, name: true, salary: true },
          },
        },
      });

      // Buscar recessos aprovados futuros
      const futureRecess = await prisma.recessRequest.findMany({
        where: {
          status: "APPROVED",
          startDate: { gte: now },
          providerArea: areasToFetch ? { in: areasToFetch } : undefined,
        },
        include: { provider: { select: { name: true } } },
        orderBy: { startDate: "asc" },
        take: 10,
      });

      userAreas = areas.map((area) => ({
        id: area.id,
        name: area.name,
        providerCount: area.providers.length,
        totalSalary: area.providers.reduce((sum, p) => sum + p.salary.toNumber(), 0),
        upcomingRecess: futureRecess
          .filter((r) => r.providerArea === area.id)
          .slice(0, 3)
          .map((r) => ({
            name: r.provider.name,
            startDate: r.startDate,
            endDate: r.endDate,
          })),
      }));
    }

    // Contratacoes em andamento (apenas para RH, CEO, Admin)
    let hiringInProgress: Array<{
      id: string;
      position: string;
      area: string;
      status: string;
    }> = [];

    if (isHRDirector || isAdmin) {
      const hirings = await prisma.hiringRequest.findMany({
        where: {
          status: "APPROVED",
          hiringStatus: { in: ["WAITING", "IN_PROGRESS"] },
        },
        orderBy: { updatedAt: "desc" },
        take: 5,
      });

      hiringInProgress = hirings.map((h) => ({
        id: h.id,
        position: h.position,
        area: h.area,
        status: h.hiringStatus,
      }));
    }

    // Resumo mensal (para C-level e admin)
    let monthlyStats = null;

    if (isCLevel || isAdmin) {
      const [created, approved, rejected, hiringApproved, terminationsApproved] = await Promise.all(
        [
          // Total criadas
          Promise.all([
            prisma.recessRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.terminationRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.hiringRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.purchaseRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
            prisma.remunerationRequest.count({ where: { createdAt: { gte: startOfMonth } } }),
          ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
          // Total aprovadas
          Promise.all([
            prisma.recessRequest.count({
              where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.terminationRequest.count({
              where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.hiringRequest.count({
              where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.purchaseRequest.count({
              where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.remunerationRequest.count({
              where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
            }),
          ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
          // Total rejeitadas
          Promise.all([
            prisma.recessRequest.count({
              where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.terminationRequest.count({
              where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.hiringRequest.count({
              where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.purchaseRequest.count({
              where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
            }),
            prisma.remunerationRequest.count({
              where: { status: "REJECTED", updatedAt: { gte: startOfMonth } },
            }),
          ]).then((counts) => counts.reduce((a, b) => a + b, 0)),
          // Contratacoes aprovadas
          prisma.hiringRequest.count({
            where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
          }),
          // Desligamentos aprovados
          prisma.terminationRequest.count({
            where: { status: "APPROVED", updatedAt: { gte: startOfMonth } },
          }),
        ]
      );

      monthlyStats = {
        created,
        approved,
        rejected,
        hiringApproved,
        terminationsApproved,
      };
    }

    return {
      user: {
        name: currentUser.name,
        position: currentUser.position?.name || "Sem cargo",
        level: userLevel,
        canApprove,
        isAdmin,
        isDirector,
        isHRDirector,
        isCLevel,
      },
      pendingCounts,
      general: {
        activeProviders,
        totalSalary: totalSalary._sum.salary?.toNumber() || 0,
      },
      myRequests,
      userAreas,
      hiringInProgress,
      monthlyStats,
    };
  }),

  // Listar usuarios pendentes (para admin dashboard)
  getPendingUsers: protectedProcedure.query(async ({ ctx }) => {
    const currentUser = await prisma.user.findUnique({
      where: { id: ctx.session.user.id },
    });

    if (!currentUser?.isAdmin) {
      throw new Error("Acesso negado");
    }

    const users = await prisma.user.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    return users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
    }));
  }),
});
