"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar,
  ChevronRight,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function RecessListPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("todas");

  const requestsQuery = useQuery(
    trpc.recess.list.queryOptions({})
  );

  const filteredRequests = requestsQuery.data?.filter((r) => {
    const matchesSearch =
      r.provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.providerArea.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeTab === "todas") return matchesSearch;
    if (activeTab === "pendentes") return matchesSearch && r.status === "PENDING";
    if (activeTab === "aprovadas") return matchesSearch && r.status === "APPROVED";
    if (activeTab === "acompanhamento") {
      // Aprovados com período ainda não finalizado
      return matchesSearch && r.status === "APPROVED" && new Date(r.endDate) >= new Date();
    }

    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recesso / Férias</h1>
          <p className="text-muted-foreground">
            Gerencie as solicitações de recesso e férias
          </p>
        </div>
        <Link href="/solicitacoes/recesso/nova">
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
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{requestsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Calendar className="h-4 w-4 text-yellow-500" />
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
            <Calendar className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {requestsQuery.data?.filter((r) => r.status === "APPROVED").length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {requestsQuery.data?.filter((r) => r.status === "APPROVED" && new Date(r.endDate) >= new Date()).length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="aprovadas">Aprovadas</TabsTrigger>
          <TabsTrigger value="acompanhamento">Acompanhamento</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Solicitações</CardTitle>
              <CardDescription>
                {activeTab === "acompanhamento"
                  ? "Recessos aprovados ainda em andamento"
                  : "Lista de solicitações de recesso/férias"}
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
                  icon={Calendar}
                  title="Nenhuma solicitacao encontrada"
                  description={searchTerm ? "Tente ajustar os filtros" : "Nenhuma solicitacao de recesso/ferias cadastrada"}
                />
              ) : (
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Prestador</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Dias</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Solicitado em</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {request.provider.name}
                          </TableCell>
                          <TableCell>{request.providerArea}</TableCell>
                          <TableCell>
                            {format(new Date(request.startDate), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}{" "}
                            -{" "}
                            {format(new Date(request.endDate), "dd/MM/yyyy", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{request.daysCount} dias</Badge>
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
                            <Link href={`/solicitacoes/recesso/${request.id}`}>
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
