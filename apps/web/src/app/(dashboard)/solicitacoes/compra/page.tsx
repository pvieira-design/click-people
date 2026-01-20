"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  CreditCard,
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function PurchaseListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const requestsQuery = useQuery(
    trpc.purchase.list.queryOptions({
      status: statusFilter !== "all" ? (statusFilter as "PENDING" | "APPROVED" | "REJECTED") : undefined,
    })
  );

  const filteredRequests = requestsQuery.data?.filter((r) =>
    r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.requesterArea.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.creator.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalValue = requestsQuery.data
    ?.filter((r) => r.status === "APPROVED")
    .reduce((sum, r) => sum + r.value, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Solicitação de Compra</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de compra e despesas
          </p>
        </div>
        <Link href="/solicitacoes/compra/nova">
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
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <CreditCard className="h-4 w-4 text-yellow-500" />
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
            <CreditCard className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requestsQuery.data?.filter((r) => r.status === "APPROVED").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Aprovado</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {formatCurrency(totalValue)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            Lista de todas as solicitações de compra
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição, área ou solicitante..."
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
              icon={CreditCard}
              title="Nenhuma solicitacao encontrada"
              description={searchTerm || statusFilter !== "all" ? "Tente ajustar os filtros" : "Nenhuma solicitacao de compra cadastrada"}
            />
          ) : (
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Data Pagamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests?.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {request.description}
                      </TableCell>
                      <TableCell>{request.creator.name}</TableCell>
                      <TableCell>{request.requesterArea}</TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(request.value)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.paymentDate), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <ApprovalStatusBadge
                          status={request.status}
                          currentStep={request.currentStep}
                          totalSteps={request.totalSteps}
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(request.createdAt), "dd/MM/yyyy", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Link href={`/solicitacoes/compra/${request.id}`}>
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
    </div>
  );
}
