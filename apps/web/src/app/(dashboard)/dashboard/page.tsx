import {
  CalendarDays,
  Clock,
  DollarSign,
  FileText,
  TrendingUp,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DashboardPage() {
  // Dados mockados - serao substituidos por dados reais do banco
  const stats = [
    {
      title: "Pendencias",
      value: "12",
      description: "Solicitacoes aguardando sua acao",
      icon: Clock,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      title: "Prestadores Ativos",
      value: "48",
      description: "Total de colaboradores ativos",
      icon: Users,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Folha Mensal",
      value: "R$ 245.000",
      description: "Custo total da folha",
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "Contratacoes",
      value: "3",
      description: "Em andamento este mes",
      icon: UserPlus,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
  ];

  const recentRequests = [
    {
      type: "Recesso",
      description: "Joao Silva - 15 a 25/02/2026",
      status: "pending",
      icon: CalendarDays,
    },
    {
      type: "Contratacao",
      description: "Desenvolvedor Senior - Tecnologia",
      status: "approved",
      icon: UserPlus,
    },
    {
      type: "Desligamento",
      description: "Maria Santos - Atendimento",
      status: "pending",
      icon: UserMinus,
    },
    {
      type: "Remuneracao",
      description: "Carlos Lima - Aumento de R$ 5.000 para R$ 6.500",
      status: "pending",
      icon: DollarSign,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Bem-vindo ao Click People - Sistema de Gestao de Capital Humano
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <div className={`rounded-full p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Solicitacoes Recentes</CardTitle>
            <CardDescription>Ultimas solicitacoes que precisam de atencao</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentRequests.map((request, index) => (
                <div key={index} className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <request.icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">{request.type}</p>
                    <p className="text-sm text-muted-foreground">{request.description}</p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      request.status === "pending"
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                    }`}
                  >
                    {request.status === "pending" ? "Pendente" : "Aprovado"}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo Mensal</CardTitle>
            <CardDescription>Performance do mes atual</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Solicitacoes criadas</span>
                </div>
                <span className="font-medium">24</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <span className="text-sm">Aprovadas</span>
                </div>
                <span className="font-medium text-emerald-500">18</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">Pendentes</span>
                </div>
                <span className="font-medium text-amber-500">6</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Novas contratacoes</span>
                </div>
                <span className="font-medium text-blue-500">3</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-red-500" />
                  <span className="text-sm">Desligamentos</span>
                </div>
                <span className="font-medium text-red-500">1</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
