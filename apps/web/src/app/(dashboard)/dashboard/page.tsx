"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Cake,
  CalendarDays,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  Loader2,
  Plus,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const REQUEST_ICONS: Record<string, any> = {
  recess: CalendarDays,
  termination: UserMinus,
  hiring: UserPlus,
  purchase: CreditCard,
  remuneration: DollarSign,
};

const REQUEST_LABELS: Record<string, string> = {
  recess: "Recesso",
  termination: "Desligamento",
  hiring: "Contratacao",
  purchase: "Compra",
  remuneration: "Remuneracao",
};

const REQUEST_ROUTES: Record<string, string> = {
  recess: "/solicitacoes/recesso",
  termination: "/solicitacoes/desligamento",
  hiring: "/solicitacoes/contratacao",
  purchase: "/solicitacoes/compra",
  remuneration: "/solicitacoes/remuneracao",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  REJECTED: "Rejeitada",
};

const HIRING_STATUS_LABELS: Record<string, string> = {
  WAITING: "Aguardando",
  IN_PROGRESS: "Em andamento",
  HIRED: "Contratado",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export default function DashboardPage() {
  const statsQuery = useQuery(trpc.dashboard.getGeneralStats.queryOptions());
  const birthdaysQuery = useQuery(trpc.dashboard.getBirthdays.queryOptions());

  if (statsQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const data = statsQuery.data;
  const user = data?.user;
  const pendingCounts = data?.pendingCounts;
  const totalPending =
    (pendingCounts?.recess || 0) +
    (pendingCounts?.termination || 0) +
    (pendingCounts?.hiring || 0) +
    (pendingCounts?.purchase || 0) +
    (pendingCounts?.remuneration || 0);

  return (
    <div className="space-y-6">
      {/* Header com saudacao */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Ola, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-muted-foreground">
          {user?.position} {user?.isAdmin && "- Administrador"}
        </p>
      </div>

      {/* Pendencias para aprovadores */}
      {user?.canApprove && totalPending > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Aguardando sua aprovacao
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {Object.entries(pendingCounts || {}).map(([key, count]) => {
              if (count === 0 || !REQUEST_ICONS[key]) return null;
              const Icon = REQUEST_ICONS[key];
              const route = REQUEST_ROUTES[key] as "/solicitacoes/recesso";
              return (
                <Link key={key} href={route}>
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="rounded-full p-2 bg-amber-500/10">
                            <Icon className="h-4 w-4 text-amber-500" />
                          </div>
                          <div>
                            <p className="font-medium">{REQUEST_LABELS[key]}</p>
                            <p className="text-xs text-muted-foreground">
                              {count} pendente{count > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Aniversariantes */}
      {birthdaysQuery.data && (birthdaysQuery.data.currentMonth.birthdays.length > 0 || birthdaysQuery.data.nextMonth.birthdays.length > 0) && (
        <div className="grid gap-4 md:grid-cols-2">
          {birthdaysQuery.data.currentMonth.birthdays.length > 0 && (
            <Card className="border-pink-200 dark:border-pink-900">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cake className="h-4 w-4 text-pink-500" />
                  Aniversariantes de {MONTH_NAMES[birthdaysQuery.data.currentMonth.month - 1]}
                </CardTitle>
                <CardDescription>
                  {birthdaysQuery.data.currentMonth.birthdays.length} aniversariante{birthdaysQuery.data.currentMonth.birthdays.length > 1 ? "s" : ""} este mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {birthdaysQuery.data.currentMonth.birthdays.map((birthday) => (
                    <div key={birthday.id} className="flex items-center justify-between p-2 rounded-lg bg-pink-50 dark:bg-pink-900/20">
                      <div>
                        <p className="text-sm font-medium">{birthday.name}</p>
                        <p className="text-xs text-muted-foreground">{birthday.area} - {birthday.position}</p>
                      </div>
                      <Badge variant="outline" className="text-pink-600 border-pink-300">
                        {format(new Date(birthday.birthDate), "dd/MM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {birthdaysQuery.data.nextMonth.birthdays.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Cake className="h-4 w-4 text-muted-foreground" />
                  Aniversariantes de {MONTH_NAMES[birthdaysQuery.data.nextMonth.month - 1]}
                </CardTitle>
                <CardDescription>
                  {birthdaysQuery.data.nextMonth.birthdays.length} aniversariante{birthdaysQuery.data.nextMonth.birthdays.length > 1 ? "s" : ""} no proximo mes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {birthdaysQuery.data.nextMonth.birthdays.map((birthday) => (
                    <div key={birthday.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{birthday.name}</p>
                        <p className="text-xs text-muted-foreground">{birthday.area} - {birthday.position}</p>
                      </div>
                      <Badge variant="secondary">
                        {format(new Date(birthday.birthDate), "dd/MM", { locale: ptBR })}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Criar solicitacoes (apenas diretores+) */}
      {user?.isDirector && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Nova Solicitacao
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Link href="/solicitacoes/recesso/nova">
                <Button variant="outline" size="sm">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Recesso
                </Button>
              </Link>
              <Link href="/solicitacoes/desligamento/nova">
                <Button variant="outline" size="sm">
                  <UserMinus className="mr-2 h-4 w-4" />
                  Desligamento
                </Button>
              </Link>
              <Link href="/solicitacoes/contratacao/nova">
                <Button variant="outline" size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Contratacao
                </Button>
              </Link>
              <Link href="/solicitacoes/compra/nova">
                <Button variant="outline" size="sm">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Compra
                </Button>
              </Link>
              <Link href="/solicitacoes/remuneracao/nova">
                <Button variant="outline" size="sm">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Remuneracao
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Minhas solicitacoes (diretores+) */}
        {user?.isDirector && (data?.myRequests?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Minhas Solicitacoes</CardTitle>
              <CardDescription>Ultimas solicitacoes criadas por voce</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.myRequests?.map((request) => {
                  const Icon = REQUEST_ICONS[request.type];
                  const detailRoute = `${REQUEST_ROUTES[request.type]}/${request.id}` as any;
                  return (
                    <Link
                      key={`${request.type}-${request.id}`}
                      href={detailRoute}
                    >
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="rounded-full p-2 bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{request.description}</p>
                          {request.status === "PENDING" && request.currentStep && (
                            <p className="text-xs text-muted-foreground">
                              Aguardando {request.currentStep}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="secondary"
                          className={STATUS_COLORS[request.status]}
                        >
                          {STATUS_LABELS[request.status]}
                        </Badge>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Contratacoes em andamento (RH e Admin) */}
        {user?.isHRDirector && (data?.hiringInProgress?.length || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Contratacoes em Andamento
              </CardTitle>
              <CardDescription>Processos aprovados aguardando finalizacao</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data?.hiringInProgress?.map((hiring) => (
                  <Link key={hiring.id} href={`/solicitacoes/contratacao/${hiring.id}` as any}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div>
                        <p className="text-sm font-medium">{hiring.position}</p>
                        <p className="text-xs text-muted-foreground">{hiring.area}</p>
                      </div>
                      <Badge variant="outline">
                        {HIRING_STATUS_LABELS[hiring.status]}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/solicitacoes/contratacao">
                <Button variant="outline" className="w-full mt-3">
                  Ver todas
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Areas do usuario */}
      {(data?.userAreas?.length || 0) > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Users className="h-5 w-5" />
            {user?.isCLevel || user?.isAdmin ? "Visao Geral" : "Minha(s) Area(s)"}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data?.userAreas?.slice(0, 6).map((area) => (
              <Card key={area.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{area.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prestadores</span>
                      <span className="font-medium">{area.providerCount}</span>
                    </div>
                    {(user?.isCLevel || user?.isAdmin || user?.isHRDirector) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Folha</span>
                        <span className="font-medium">{formatCurrency(area.totalSalary)}</span>
                      </div>
                    )}
                    {area.upcomingRecess.length > 0 && (
                      <div className="pt-2 border-t mt-2">
                        <p className="text-xs text-muted-foreground mb-1">Proximos recessos:</p>
                        {area.upcomingRecess.map((recess, idx) => (
                          <p key={idx} className="text-xs">
                            {recess.name} -{" "}
                            {format(new Date(recess.startDate), "dd/MM", { locale: ptBR })} a{" "}
                            {format(new Date(recess.endDate), "dd/MM", { locale: ptBR })}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Numeros gerais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestadores Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.general.activeProviders || 0}</div>
            <p className="text-xs text-muted-foreground">colaboradores no sistema</p>
          </CardContent>
        </Card>

        {(user?.isCLevel || user?.isAdmin || user?.isHRDirector) && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Folha Base</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data?.general.totalSalary || 0)}
              </div>
              <p className="text-xs text-muted-foreground">soma dos salarios</p>
            </CardContent>
          </Card>
        )}

        {user?.canApprove && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Suas Pendencias</CardTitle>
              <Clock className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
              <p className="text-xs text-muted-foreground">aguardando sua acao</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resumo mensal (C-level e Admin) */}
      {data?.monthlyStats && (
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
                <p className="text-sm text-muted-foreground">Criadas</p>
                <p className="text-2xl font-bold mt-1">{data.monthlyStats.created}</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-emerald-500/10">
                <p className="text-sm text-emerald-600">Aprovadas</p>
                <p className="text-2xl font-bold mt-1 text-emerald-600">
                  {data.monthlyStats.approved}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-red-500/10">
                <p className="text-sm text-red-600">Rejeitadas</p>
                <p className="text-2xl font-bold mt-1 text-red-600">
                  {data.monthlyStats.rejected}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-blue-500/10">
                <p className="text-sm text-blue-600">Contratacoes</p>
                <p className="text-2xl font-bold mt-1 text-blue-600">
                  {data.monthlyStats.hiringApproved}
                </p>
              </div>
              <div className="text-center p-4 rounded-lg bg-gray-500/10">
                <p className="text-sm text-gray-600">Desligamentos</p>
                <p className="text-2xl font-bold mt-1 text-gray-600">
                  {data.monthlyStats.terminationsApproved}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mensagem para usuarios sem permissoes especiais */}
      {!user?.canApprove && !user?.isDirector && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Bem-vindo ao Click People</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                Voce pode visualizar informacoes do sistema. Navegue pelo menu lateral para
                acessar as diferentes areas.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
