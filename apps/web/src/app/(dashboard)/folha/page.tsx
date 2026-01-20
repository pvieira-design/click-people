"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Search,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

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

type Provider = {
  id: string;
  name: string;
  salary: number;
  startDate: string | Date;
  ndaStatus: "SIGNED" | "NOT_SIGNED";
  contractStatus: "SIGNED" | "NOT_SIGNED";
  isActive: boolean;
  area: { id: string; name: string };
  position: { id: string; name: string };
};

type EditingState = {
  id: string;
  field: "salary" | "ndaStatus" | "contractStatus";
  value: string;
} | null;

export default function FolhaPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);

  // Queries
  const providersQuery = useQuery(
    trpc.payroll.list.queryOptions({
      includeInactive: showInactive,
      search: searchTerm || undefined,
    })
  );

  const totalsQuery = useQuery(trpc.payroll.getTotals.queryOptions());

  // Mutations
  const updateMutation = useMutation(
    trpc.payroll.updateProvider.mutationOptions({
      onSuccess: () => {
        toast.success("Dados atualizados com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.payroll.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.payroll.getTotals.queryKey() });
        setEditing(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSaveEdit = (provider: Provider) => {
    if (!editing) return;

    const updateData: any = { id: provider.id };

    if (editing.field === "salary") {
      const salary = parseFloat(editing.value.replace(/[^\d,]/g, "").replace(",", "."));
      if (isNaN(salary) || salary <= 0) {
        toast.error("Valor de salário inválido");
        return;
      }
      updateData.salary = salary;
    } else if (editing.field === "ndaStatus") {
      updateData.ndaStatus = editing.value;
    } else if (editing.field === "contractStatus") {
      updateData.contractStatus = editing.value;
    }

    updateMutation.mutate(updateData);
  };

  const startEditing = (id: string, field: "salary" | "ndaStatus" | "contractStatus", value: string) => {
    setEditing({ id, field, value });
  };

  const cancelEditing = () => {
    setEditing(null);
  };

  const handleExport = () => {
    // Gerar CSV simples (pode ser melhorado para Excel)
    const headers = ["Nome", "Área", "Cargo", "Salário", "Data Início", "NDA", "Contrato", "Status"];
    const rows = providersQuery.data?.map((p) => [
      p.name,
      p.area.name,
      p.position.name,
      p.salary.toString(),
      format(new Date(p.startDate), "dd/MM/yyyy"),
      p.ndaStatus === "SIGNED" ? "Assinado" : "Pendente",
      p.contractStatus === "SIGNED" ? "Assinado" : "Pendente",
      p.isActive ? "Ativo" : "Inativo",
    ]);

    const csvContent = [headers.join(";"), ...(rows?.map((r) => r.join(";")) || [])].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `folha-prestadores-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast.success("Arquivo exportado com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Folha de Pagamento</h1>
          <p className="text-muted-foreground">
            Visualize e gerencie os dados contratuais dos prestadores
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Prestadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalsQuery.data?.totalProviders || 0}</div>
            <p className="text-xs text-muted-foreground">prestadores ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folha Base</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalsQuery.data?.totalSalary || 0)}
            </div>
            <p className="text-xs text-muted-foreground">soma dos salários</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Salarial</CardTitle>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                totalsQuery.data?.totalProviders
                  ? totalsQuery.data.totalSalary / totalsQuery.data.totalProviders
                  : 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">por prestador</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prestadores</CardTitle>
          <CardDescription>
            Clique no ícone de edição para alterar salário, NDA ou contrato
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, área ou cargo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <span className="text-sm text-muted-foreground">Mostrar inativos</span>
            </label>
          </div>

          {/* Table */}
          {providersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : providersQuery.isError ? (
            <ErrorState
              message={providersQuery.error?.message}
              onRetry={() => providersQuery.refetch()}
            />
          ) : providersQuery.data?.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Nenhum prestador encontrado"
              description={searchTerm ? "Tente ajustar a busca" : "Nao ha prestadores ativos no sistema"}
            />
          ) : (
            <div className="rounded-2xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Área</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Salário</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>NDA</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providersQuery.data?.map((provider) => (
                    <TableRow key={provider.id} className={!provider.isActive ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.area.name}</TableCell>
                      <TableCell>{provider.position.name}</TableCell>

                      {/* Salary - Inline Edit */}
                      <TableCell>
                        {editing?.id === provider.id && editing.field === "salary" ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="text"
                              value={editing.value}
                              onChange={(e) =>
                                setEditing({ ...editing, value: e.target.value })
                              }
                              className="h-8 w-28"
                              autoFocus
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveEdit(provider)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {formatCurrency(provider.salary)}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() =>
                                startEditing(provider.id, "salary", provider.salary.toString())
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        {format(new Date(provider.startDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>

                      {/* NDA Status - Inline Edit */}
                      <TableCell>
                        {editing?.id === provider.id && editing.field === "ndaStatus" ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={editing.value}
                              onValueChange={(value) =>
                                value && setEditing({ ...editing, value })
                              }
                            >
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SIGNED">Assinado</SelectItem>
                                <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveEdit(provider)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={provider.ndaStatus === "SIGNED" ? "default" : "secondary"}
                            >
                              {provider.ndaStatus === "SIGNED" ? "Assinado" : "Pendente"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() =>
                                startEditing(provider.id, "ndaStatus", provider.ndaStatus)
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      {/* Contract Status - Inline Edit */}
                      <TableCell>
                        {editing?.id === provider.id && editing.field === "contractStatus" ? (
                          <div className="flex items-center gap-1">
                            <Select
                              value={editing.value}
                              onValueChange={(value) =>
                                value && setEditing({ ...editing, value })
                              }
                            >
                              <SelectTrigger className="h-8 w-28">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="SIGNED">Assinado</SelectItem>
                                <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleSaveEdit(provider)}
                              disabled={updateMutation.isPending}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={cancelEditing}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                provider.contractStatus === "SIGNED" ? "default" : "secondary"
                              }
                            >
                              {provider.contractStatus === "SIGNED" ? "Assinado" : "Pendente"}
                            </Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-50 hover:opacity-100"
                              onClick={() =>
                                startEditing(
                                  provider.id,
                                  "contractStatus",
                                  provider.contractStatus
                                )
                              }
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <Badge variant={provider.isActive ? "default" : "destructive"}>
                          {provider.isActive ? "Ativo" : "Inativo"}
                        </Badge>
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
