"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  Loader2,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

import { ApprovalStatusBadge } from "@/components/approval-timeline";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HIRING_TYPE_LABELS = {
  INCREASE: "Aumento de Quadro",
  REPLACEMENT: "Substituição",
};

const HIRING_STATUS_LABELS = {
  WAITING: "Aguardando",
  IN_PROGRESS: "Em Andamento",
  HIRED: "Contratado",
};

const PRIORITY_LABELS = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function HiringListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("todas");

  const requestsQuery = useQuery(
    trpc.hiring.list.queryOptions({
      status: statusFilter !== "all" ? (statusFilter as "PENDING" | "APPROVED" | "REJECTED") : undefined,
      hiringStatus: activeTab === "status" ? undefined : undefined,
    })
  );

  const filteredRequests = requestsQuery.data?.filter((r) => {
    const matchesSearch =
      r.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.hiredName?.toLowerCase().includes(searchTerm.toLowerCase()) || false);

    if (activeTab === "todas") return matchesSearch;
    if (activeTab === "pendentes") return matchesSearch && r.status === "PENDING";
    if (activeTab === "aprovadas") return matchesSearch && r.status === "APPROVED";
    if (activeTab === "status") return matchesSearch && r.status === "APPROVED" && r.hiringStatus !== "HIRED";

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contratação</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de contratação
          </p>
        </div>
        <Link href="/solicitacoes/contratacao/nova">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Solicitação
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aguardando</CardTitle>
            <UserPlus className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requestsQuery.data?.filter((r) => r.status === "APPROVED" && r.hiringStatus === "WAITING").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {requestsQuery.data?.filter((r) => r.hiringStatus === "IN_PROGRESS").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contratados</CardTitle>
            <UserPlus className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requestsQuery.data?.filter((r) => r.hiringStatus === "HIRED").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
          <TabsTrigger value="status">Acompanhamento</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações</CardTitle>
              <CardDescription>
                {activeTab === "status"
                  ? "Acompanhe o status das contratações aprovadas"
                  : "Lista de solicitações de contratação"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por área, cargo ou nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Table */}
              {requestsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : requestsQuery.isError ? (
                <ErrorState
                  message={requestsQuery.error?.message}
                  onRetry={() => requestsQuery.refetch()}
                />
              ) : filteredRequests?.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="Nenhuma solicitacao encontrada"
                  description={searchTerm ? "Tente ajustar os filtros" : "Nenhuma solicitacao de contratacao cadastrada"}
                />
              ) : (
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área / Cargo</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Salário Proposto</TableHead>
                        <TableHead>Prioridade</TableHead>
                        {activeTab === "status" ? (
                          <>
                            <TableHead>Status Contratação</TableHead>
                            <TableHead>Contratado</TableHead>
                          </>
                        ) : (
                          <TableHead>Status Aprovação</TableHead>
                        )}
                        <TableHead>Solicitado em</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{request.position}</p>
                              <p className="text-sm text-muted-foreground">{request.area}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={request.hiringType === "INCREASE" ? "default" : "secondary"}>
                              {HIRING_TYPE_LABELS[request.hiringType]}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(request.proposedSalary)}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                request.priority === "HIGH"
                                  ? "destructive"
                                  : request.priority === "MEDIUM"
                                    ? "default"
                                    : "secondary"
                              }
                            >
                              {PRIORITY_LABELS[request.priority]}
                            </Badge>
                          </TableCell>
                          {activeTab === "status" ? (
                            <>
                              <TableCell>
                                <Badge
                                  variant={
                                    request.hiringStatus === "HIRED"
                                      ? "default"
                                      : request.hiringStatus === "IN_PROGRESS"
                                        ? "secondary"
                                        : "outline"
                                  }
                                  className={
                                    request.hiringStatus === "HIRED"
                                      ? "bg-green-500 text-white"
                                      : request.hiringStatus === "IN_PROGRESS"
                                        ? "bg-blue-500 text-white"
                                        : ""
                                  }
                                >
                                  {HIRING_STATUS_LABELS[request.hiringStatus]}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {request.hiredName || "-"}
                              </TableCell>
                            </>
                          ) : (
                            <TableCell>
                              <ApprovalStatusBadge
                                status={request.status}
                                currentStep={request.currentStep}
                                totalSteps={request.totalSteps}
                              />
                            </TableCell>
                          )}
                          <TableCell>
                            {format(new Date(request.createdAt), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Link href={`/solicitacoes/contratacao/${request.id}`}>
                              <Button size="icon" variant="ghost">
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
