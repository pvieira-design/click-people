"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowUpRight,
  ChevronRight,
  DollarSign,
  Loader2,
  Plus,
  Search,
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

const calculatePercentChange = (oldValue: number, newValue: number) => {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
};

export default function RemunerationListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const requestsQuery = useQuery(
    trpc.remuneration.list.queryOptions({
      status: statusFilter !== "all" ? (statusFilter as "PENDING" | "APPROVED" | "REJECTED") : undefined,
    })
  );

  const filteredRequests = requestsQuery.data?.filter((r) =>
    r.provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.providerArea.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mudança de Remuneração</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de alteração de salário
          </p>
        </div>
        <Link href="/solicitacoes/remuneracao/nova">
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {requestsQuery.data?.filter((r) => r.status === "PENDING").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprovadas</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requestsQuery.data?.filter((r) => r.status === "APPROVED").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejeitadas</CardTitle>
            <DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {requestsQuery.data?.filter((r) => r.status === "REJECTED").length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            Lista de todas as solicitações de mudança de remuneração
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por prestador ou área..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="PENDING">Pendentes</SelectItem>
                <SelectItem value="APPROVED">Aprovadas</SelectItem>
                <SelectItem value="REJECTED">Rejeitadas</SelectItem>
              </SelectContent>
            </Select>
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
              icon={DollarSign}
              title="Nenhuma solicitacao encontrada"
              description={searchTerm || statusFilter !== "all" ? "Tente ajustar os filtros" : "Nenhuma solicitacao de remuneracao cadastrada"}
            />
          ) : (
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Salário Atual</TableHead>
                    <TableHead>Novo Salário</TableHead>
                    <TableHead>Variação</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vigência</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => {
                    const percentChange = calculatePercentChange(
                      request.currentSalary,
                      request.newSalary
                    );

                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.provider.name}
                        </TableCell>
                        <TableCell>{request.providerArea}</TableCell>
                        <TableCell>{formatCurrency(request.currentSalary)}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(request.newSalary)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-green-600">
                            <ArrowUpRight className="h-4 w-4" />
                            <span>+{percentChange.toFixed(1)}%</span>
                          </div>
                        </TableCell>
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
                        <TableCell>
                          <ApprovalStatusBadge
                            status={request.status}
                            currentStep={request.currentStep}
                            totalSteps={request.totalSteps}
                          />
                        </TableCell>
                        <TableCell>
                          {format(new Date(request.effectiveDate), "dd/MM/yyyy", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          <Link href={`/solicitacoes/remuneracao/${request.id}`}>
                            <Button size="icon" variant="ghost">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
