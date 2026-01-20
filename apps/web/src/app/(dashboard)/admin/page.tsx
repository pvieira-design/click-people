"use client";

import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  Settings,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const ACTION_LABELS: Record<string, string> = {
  CREATE: "criou",
  UPDATE: "atualizou",
  DELETE: "excluiu",
  APPROVE: "aprovou",
  REJECT: "rejeitou",
  LOGIN: "fez login",
  LOGOUT: "fez logout",
  VIEW: "visualizou",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "usuario",
  Provider: "prestador",
  RecessRequest: "recesso",
  TerminationRequest: "desligamento",
  HiringRequest: "contratacao",
  PurchaseRequest: "compra",
  RemunerationRequest: "remuneracao",
  Area: "area",
  Position: "cargo",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboardPage() {
  const statsQuery = useQuery(trpc.dashboard.getAdminStats.queryOptions());
  const pendingUsersQuery = useQuery(trpc.dashboard.getPendingUsers.queryOptions());

  if (statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = statsQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Administrativo</h1>
        <p className="text-muted-foreground">
          Visao geral do sistema e alertas importantes
        </p>
      </div>

      {/* Alertas Urgentes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className={stats?.alerts.pendingUsers ? "border-amber-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Pendentes</CardTitle>
            <div className="rounded-full p-2 bg-amber-500/10">
              <UserCheck className="h-4 w-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.alerts.pendingUsers || 0}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovacao</p>
            {(stats?.alerts.pendingUsers || 0) > 0 && (
              <Link href="/admin/usuarios">
                <Button variant="link" className="px-0 mt-2 h-auto text-amber-600">
                  Ver todos <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>

        <Card className={stats?.alerts.stalledRequests ? "border-red-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solicitacoes Paradas</CardTitle>
            <div className="rounded-full p-2 bg-red-500/10">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.alerts.stalledRequests || 0}</div>
            <p className="text-xs text-muted-foreground">Sem acao ha mais de 7 dias</p>
          </CardContent>
        </Card>

        <Card className={stats?.alerts.pendingDocs ? "border-orange-500" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Docs Pendentes</CardTitle>
            <div className="rounded-full p-2 bg-orange-500/10">
              <FileText className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.alerts.pendingDocs || 0}</div>
            <p className="text-xs text-muted-foreground">NDA ou contrato nao assinado</p>
            {(stats?.alerts.pendingDocs || 0) > 0 && (
              <Link href="/folha">
                <Button variant="link" className="px-0 mt-2 h-auto text-orange-600">
                  Ver na Folha <ArrowRight className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Saude do Sistema */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.system.users.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.system.users.total || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.system.providers.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {stats?.system.providers.total || 0} total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folha Base</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.system.totalSalary || 0)}
            </div>
            <p className="text-xs text-muted-foreground">soma dos salarios</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Acoes Hoje</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.system.todayActions || 0}</div>
            <p className="text-xs text-muted-foreground">registradas no sistema</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Atividade Recente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>Ultimas acoes registradas no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.recentLogs?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma atividade recente
                </p>
              ) : (
                stats?.recentLogs?.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center gap-3 text-sm border-b pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{log.userName}</span>{" "}
                      <span className="text-muted-foreground">
                        {ACTION_LABELS[log.action] || log.action}{" "}
                        {ENTITY_LABELS[log.entityType] || log.entityType}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(log.createdAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                ))
              )}
            </div>
            <Link href="/admin/logs">
              <Button variant="outline" className="w-full mt-4">
                Ver todos os logs
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Atalhos Rapidos + Usuarios Pendentes */}
        <div className="space-y-4">
          {/* Usuarios Pendentes */}
          {(pendingUsersQuery.data?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Usuarios Aguardando</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {pendingUsersQuery.data?.slice(0, 3).map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  ))}
                </div>
                <Link href="/admin/usuarios">
                  <Button variant="outline" className="w-full mt-3">
                    Gerenciar usuarios
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Atalhos Rapidos */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Atalhos Rapidos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <Link href="/admin/usuarios">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Usuarios
                  </Button>
                </Link>
                <Link href="/admin/prestadores">
                  <Button variant="outline" className="w-full justify-start">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Prestadores
                  </Button>
                </Link>
                <Link href="/admin/areas">
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Areas
                  </Button>
                </Link>
                <Link href="/admin/cargos">
                  <Button variant="outline" className="w-full justify-start">
                    <UserCheck className="mr-2 h-4 w-4" />
                    Cargos
                  </Button>
                </Link>
                <Link href="/admin/logs">
                  <Button variant="outline" className="w-full justify-start">
                    <Activity className="mr-2 h-4 w-4" />
                    Logs
                  </Button>
                </Link>
                <Link href="/admin/configuracoes">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Config
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Resumo do Mes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Resumo do Mes
          </CardTitle>
          <CardDescription>Performance do mes atual</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Solicitacoes Criadas</p>
              <p className="text-2xl font-bold mt-1">{stats?.monthly.created || 0}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-emerald-500/10">
              <p className="text-sm text-emerald-600">Aprovadas</p>
              <p className="text-2xl font-bold mt-1 text-emerald-600">
                {stats?.monthly.approved || 0}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-500/10">
              <p className="text-sm text-red-600">Rejeitadas</p>
              <p className="text-2xl font-bold mt-1 text-red-600">
                {stats?.monthly.rejected || 0}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-blue-500/10">
              <p className="text-sm text-blue-600">Contratacoes</p>
              <p className="text-2xl font-bold mt-1 text-blue-600">
                {stats?.monthly.hiringApproved || 0}
                {(stats?.monthly.hiringInProgress || 0) > 0 && (
                  <span className="text-sm font-normal">
                    {" "}
                    ({stats?.monthly.hiringInProgress} em andamento)
                  </span>
                )}
              </p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-primary">Compras Aprovadas</p>
              <p className="text-2xl font-bold mt-1 text-primary">
                {formatCurrency(stats?.monthly.purchasesApproved || 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
