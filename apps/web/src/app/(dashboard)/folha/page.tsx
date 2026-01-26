"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Check,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  Pencil,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { DocumentUploadModal } from "@/components/document-upload-modal";
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
  ndaFileUrl: string | null;
  contractStatus: "SIGNED" | "NOT_SIGNED";
  contractFileUrl: string | null;
  isActive: boolean;
  area: { id: string; name: string };
  position: { id: string; name: string };
};

type UploadModalState = {
  open: boolean;
  documentType: "nda" | "contract";
  providerId: string;
  providerName: string;
} | null;

type UpdateProviderInput = {
  id: string;
  salary?: number;
  ndaStatus?: "SIGNED" | "NOT_SIGNED";
  ndaFileUrl?: string | null;
  contractStatus?: "SIGNED" | "NOT_SIGNED";
  contractFileUrl?: string | null;
};

type EditingState = {
  id: string;
  field: "salary" | "ndaStatus" | "contractStatus";
  value: string;
} | null;

type SortColumn = "name" | "area" | "position" | "salary" | "startDate" | "ndaStatus" | "contractStatus" | "isActive";
type SortDirection = "asc" | "desc";

export default function FolhaPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [editing, setEditing] = useState<EditingState>(null);
  const [sortColumn, setSortColumn] = useState<SortColumn>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [uploadModal, setUploadModal] = useState<UploadModalState>(null);

  // Queries
  const userQuery = useQuery(trpc.user.me.queryOptions());
  const isAdmin = userQuery.data?.isAdmin ?? false;

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

  // Sorting logic
  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const sortedProviders = useMemo(() => {
    if (!providersQuery.data) return [];

    return [...providersQuery.data].sort((a, b) => {
      let comparison = 0;

      switch (sortColumn) {
        case "name":
          comparison = a.name.localeCompare(b.name, "pt-BR");
          break;
        case "area":
          comparison = a.area.name.localeCompare(b.area.name, "pt-BR");
          break;
        case "position":
          comparison = a.position.name.localeCompare(b.position.name, "pt-BR");
          break;
        case "salary":
          comparison = a.salary - b.salary;
          break;
        case "startDate":
          comparison = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
          break;
        case "ndaStatus":
          comparison = a.ndaStatus.localeCompare(b.ndaStatus);
          break;
        case "contractStatus":
          comparison = a.contractStatus.localeCompare(b.contractStatus);
          break;
        case "isActive":
          comparison = (a.isActive === b.isActive) ? 0 : a.isActive ? -1 : 1;
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [providersQuery.data, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="ml-1 h-4 w-4 text-muted-foreground/50" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-1 h-4 w-4" />
    );
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleSaveEdit = (provider: Provider) => {
    if (!editing) return;

    if (editing.field === "salary") {
      const salary = parseFloat(editing.value.replace(/[^\d,]/g, "").replace(",", "."));
      if (isNaN(salary) || salary <= 0) {
        toast.error("Valor de salário inválido");
        return;
      }
      updateMutation.mutate({ id: provider.id, salary });
    } else if (editing.field === "ndaStatus") {
      const newStatus = editing.value as "SIGNED" | "NOT_SIGNED";
      // Se mudando para SIGNED e não tem arquivo, abrir modal de upload
      if (newStatus === "SIGNED" && !provider.ndaFileUrl) {
        setUploadModal({
          open: true,
          documentType: "nda",
          providerId: provider.id,
          providerName: provider.name,
        });
        return;
      }
      updateMutation.mutate({ id: provider.id, ndaStatus: newStatus });
    } else if (editing.field === "contractStatus") {
      const newStatus = editing.value as "SIGNED" | "NOT_SIGNED";
      // Se mudando para SIGNED e não tem arquivo, abrir modal de upload
      if (newStatus === "SIGNED" && !provider.contractFileUrl) {
        setUploadModal({
          open: true,
          documentType: "contract",
          providerId: provider.id,
          providerName: provider.name,
        });
        return;
      }
      updateMutation.mutate({ id: provider.id, contractStatus: newStatus });
    }
  };

  const handleUploadSuccess = (fileUrl: string) => {
    if (!uploadModal) return;

    const updateData: UpdateProviderInput = { id: uploadModal.providerId };

    if (uploadModal.documentType === "nda") {
      updateData.ndaStatus = "SIGNED";
      updateData.ndaFileUrl = fileUrl;
    } else {
      updateData.contractStatus = "SIGNED";
      updateData.contractFileUrl = fileUrl;
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
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Nome
                        <SortIcon column="name" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("area")}
                    >
                      <div className="flex items-center">
                        Área
                        <SortIcon column="area" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("position")}
                    >
                      <div className="flex items-center">
                        Cargo
                        <SortIcon column="position" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("salary")}
                    >
                      <div className="flex items-center">
                        Salário
                        <SortIcon column="salary" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("startDate")}
                    >
                      <div className="flex items-center">
                        Data Início
                        <SortIcon column="startDate" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("ndaStatus")}
                    >
                      <div className="flex items-center">
                        NDA
                        <SortIcon column="ndaStatus" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("contractStatus")}
                    >
                      <div className="flex items-center">
                        Contrato
                        <SortIcon column="contractStatus" />
                      </div>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none hover:bg-muted/50"
                      onClick={() => handleSort("isActive")}
                    >
                      <div className="flex items-center">
                        Status
                        <SortIcon column="isActive" />
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedProviders.map((provider) => (
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
                            {isAdmin && (
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
                            )}
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
                            {provider.ndaFileUrl && (
                              <a
                                href={provider.ndaFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Ver documento"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            )}
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
                            {provider.contractFileUrl && (
                              <a
                                href={provider.contractFileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-muted-foreground hover:text-foreground transition-colors"
                                title="Ver documento"
                              >
                                <FileText className="h-4 w-4" />
                              </a>
                            )}
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

      {/* Modal de Upload de Documento */}
      {uploadModal && (
        <DocumentUploadModal
          open={uploadModal.open}
          onOpenChange={(open) => {
            if (!open) {
              setUploadModal(null);
              setEditing(null);
            }
          }}
          documentType={uploadModal.documentType}
          providerId={uploadModal.providerId}
          providerName={uploadModal.providerName}
          onUploadSuccess={handleUploadSuccess}
        />
      )}
    </div>
  );
}
