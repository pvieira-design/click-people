"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  ChevronLeft,
  ChevronRight,
  FileText,
  Loader2,
  Search,
} from "lucide-react";
import { useState } from "react";

import { trpc } from "@/utils/trpc";

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

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-500",
  UPDATE: "bg-blue-500",
  DELETE: "bg-red-500",
  APPROVE: "bg-emerald-500",
  REJECT: "bg-orange-500",
  LOGIN: "bg-purple-500",
  LOGOUT: "bg-gray-500",
  VIEW: "bg-slate-500",
};

const ITEMS_PER_PAGE = 20;

type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: unknown;
  userId: string;
  createdAt: Date | string;
  user: { id: string; name: string | null; email: string } | null;
};

export default function AuditLogsPage() {
  const [filters, setFilters] = useState({
    entityType: "all",
    action: "all",
  });
  const [page, setPage] = useState(0);

  // Queries
  const logsQuery = useQuery(
    trpc.audit.listLogs.queryOptions({
      entityType: filters.entityType !== "all" ? filters.entityType : undefined,
      action: filters.action !== "all" ? filters.action : undefined,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    })
  );

  const entityTypesQuery = useQuery(trpc.audit.getEntityTypes.queryOptions());
  const actionsQuery = useQuery(trpc.audit.getActions.queryOptions());
  const statsQuery = useQuery(trpc.audit.getStats.queryOptions());

  const handlePreviousPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (logsQuery.data?.hasMore) {
      setPage(page + 1);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Logs de Auditoria</h1>
        <p className="text-muted-foreground">
          Visualize todas as ações realizadas no sistema
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsQuery.data?.users.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statsQuery.data?.users.pending || 0} pendentes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestadores Ativos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsQuery.data?.providers.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {statsQuery.data?.providers.total || 0} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Áreas / Cargos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsQuery.data?.areas || 0} / {statsQuery.data?.positions || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ações Hoje</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statsQuery.data?.logsToday || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
          <CardDescription>
            Lista de todas as ações realizadas no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center">
            <Select
              value={filters.entityType}
              onValueChange={(value) => {
                if (value) {
                  setFilters({ ...filters, entityType: value });
                  setPage(0);
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo de Entidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {entityTypesQuery.data?.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.action}
              onValueChange={(value) => {
                if (value) {
                  setFilters({ ...filters, action: value });
                  setPage(0);
                }
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {actionsQuery.data?.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          {logsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logsQuery.data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado
            </div>
          ) : (
            <>
              <div className="rounded-2xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>ID Entidade</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logsQuery.data?.logs as AuditLog[] | undefined)?.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm:ss", {
                            locale: ptBR,
                          })}
                        </TableCell>
                        <TableCell>
                          {log.user?.name || "Sistema"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={`${ACTION_COLORS[log.action] || "bg-gray-500"} text-white`}
                          >
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.entityType}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {log.entityId?.slice(-8).toUpperCase() || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Mostrando {page * ITEMS_PER_PAGE + 1} -{" "}
                  {Math.min((page + 1) * ITEMS_PER_PAGE, logsQuery.data?.total || 0)} de{" "}
                  {logsQuery.data?.total || 0} logs
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePreviousPage}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!logsQuery.data?.hasMore}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
