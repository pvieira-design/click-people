"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  UserMinus,
  UserPlus,
  X,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  birthDate?: string | Date | null;
  seniority?: string | null;
  ndaStatus: "SIGNED" | "NOT_SIGNED";
  contractStatus: "SIGNED" | "NOT_SIGNED";
  isActive: boolean;
  area: { id: string; name: string };
  position: { id: string; name: string };
  hierarchyLevel: { id: string; name: string; level: number; canApprove: boolean } | null;
  user: { id: string; name: string; email: string } | null;
  createdAt: string | Date;
};

type FormData = {
  name: string;
  salary: string;
  startDate: string;
  birthDate: string;
  hierarchyLevelId: string;
  ndaStatus: "SIGNED" | "NOT_SIGNED";
  contractStatus: "SIGNED" | "NOT_SIGNED";
  areaId: string;
  positionId: string;
};

const initialFormData: FormData = {
  name: "",
  salary: "",
  startDate: new Date().toISOString().split("T")[0],
  birthDate: "",
  hierarchyLevelId: "",
  ndaStatus: "NOT_SIGNED",
  contractStatus: "NOT_SIGNED",
  areaId: "",
  positionId: "",
};

export default function AdminPrestadoresPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const providersQuery = useQuery(trpc.provider.list.queryOptions());
  const areasQuery = useQuery(trpc.area.list.queryOptions());
  const positionsQuery = useQuery(trpc.position.list.queryOptions());
  const hierarchyLevelsQuery = useQuery(trpc.hierarchyLevel.list.queryOptions());

  // Mutations
  const createMutation = useMutation(
    trpc.provider.create.mutationOptions({
      onSuccess: () => {
        toast.success("Prestador criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.provider.update.mutationOptions({
      onSuccess: () => {
        toast.success("Prestador atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
        setIsEditDialogOpen(false);
        setSelectedProvider(null);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.provider.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Prestador removido com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
        setIsDeleteDialogOpen(false);
        setSelectedProvider(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const activateMutation = useMutation(
    trpc.provider.activate.mutationOptions({
      onSuccess: () => {
        toast.success("Prestador reativado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deactivateMutation = useMutation(
    trpc.provider.deactivate.mutationOptions({
      onSuccess: () => {
        toast.success("Prestador desativado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Filter providers
  const filteredProviders = providersQuery.data?.filter((provider) => {
    const matchesSearch =
      provider.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.area.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      provider.position.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = showInactive ? true : provider.isActive;
    return matchesSearch && matchesStatus;
  });

  // Handlers
  const handleCreate = () => {
    if (!formData.name || !formData.salary || !formData.areaId || !formData.positionId) {
      toast.error("Preencha todos os campos obrigatorios");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      salary: parseFloat(formData.salary),
      startDate: formData.startDate,
      birthDate: formData.birthDate || null,
      hierarchyLevelId: formData.hierarchyLevelId || undefined,
      ndaStatus: formData.ndaStatus,
      contractStatus: formData.contractStatus,
      areaId: formData.areaId,
      positionId: formData.positionId,
    });
  };

  const handleUpdate = () => {
    if (!selectedProvider) return;

    updateMutation.mutate({
      id: selectedProvider.id,
      name: formData.name,
      salary: parseFloat(formData.salary),
      startDate: formData.startDate,
      birthDate: formData.birthDate || null,
      hierarchyLevelId: formData.hierarchyLevelId || null,
      ndaStatus: formData.ndaStatus,
      contractStatus: formData.contractStatus,
      areaId: formData.areaId,
      positionId: formData.positionId,
    });
  };

  const handleDelete = () => {
    if (!selectedProvider) return;
    deleteMutation.mutate({ id: selectedProvider.id });
  };

  const openEditDialog = (provider: Provider) => {
    setSelectedProvider(provider);
    setFormData({
      name: provider.name,
      salary: provider.salary.toString(),
      startDate: new Date(provider.startDate).toISOString().split("T")[0],
      birthDate: provider.birthDate ? new Date(provider.birthDate).toISOString().split("T")[0] : "",
      hierarchyLevelId: provider.hierarchyLevel?.id || "",
      ndaStatus: provider.ndaStatus,
      contractStatus: provider.contractStatus,
      areaId: provider.area.id,
      positionId: provider.position.id,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (provider: Provider) => {
    setSelectedProvider(provider);
    setIsDeleteDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Helpers para obter nomes por ID
  const getAreaName = (areaId: string) => {
    return areasQuery.data?.find((a) => a.id === areaId)?.name || "Selecione";
  };

  const getPositionName = (positionId: string) => {
    return positionsQuery.data?.find((p) => p.id === positionId)?.name || "Selecione";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prestadores</h1>
          <p className="text-muted-foreground">
            Gerencie os prestadores de servico cadastrados no sistema
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Prestador
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Prestadores</CardTitle>
          <CardDescription>
            {filteredProviders?.length || 0} prestadores encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Filters */}
          <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, area ou cargo..."
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
          ) : filteredProviders?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum prestador encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Area</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Senioridade</TableHead>
                    <TableHead>Salario</TableHead>
                    <TableHead>Inicio</TableHead>
                    <TableHead>NDA</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders?.map((provider) => (
                    <TableRow key={provider.id} className={!provider.isActive ? "opacity-60" : ""}>
                      <TableCell className="font-medium">{provider.name}</TableCell>
                      <TableCell>{provider.area.name}</TableCell>
                      <TableCell>{provider.position.name}</TableCell>
                      <TableCell>
                        {provider.hierarchyLevel?.name || "-"}
                      </TableCell>
                      <TableCell>{formatCurrency(provider.salary)}</TableCell>
                      <TableCell>
                        {format(new Date(provider.startDate), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.ndaStatus === "SIGNED" ? "default" : "secondary"}>
                          {provider.ndaStatus === "SIGNED" ? "Assinado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={provider.contractStatus === "SIGNED" ? "default" : "secondary"}
                        >
                          {provider.contractStatus === "SIGNED" ? "Assinado" : "Pendente"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={provider.isActive ? "default" : "destructive"}>
                          {provider.isActive ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(provider as Provider)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {provider.isActive ? (
                              <DropdownMenuItem
                                onClick={() => deactivateMutation.mutate({ id: provider.id })}
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Desativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => activateMutation.mutate({ id: provider.id })}
                              >
                                <UserPlus className="mr-2 h-4 w-4" />
                                Reativar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(provider as Provider)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Prestador</DialogTitle>
            <DialogDescription>
              Preencha os dados para cadastrar um novo prestador de servico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="salary">Salario *</Label>
                <Input
                  id="salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Data de Inicio *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="area">Area *</Label>
                <Select
                  value={formData.areaId}
                  onValueChange={(value) => {
                    if (value) {
                      // Limpa o cargo quando a area muda
                      setFormData({ ...formData, areaId: value, positionId: "" });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {formData.areaId ? getAreaName(formData.areaId) : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {areasQuery.data?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="position">Cargo *</Label>
                <Select
                  value={formData.positionId}
                  onValueChange={(value) => value && setFormData({ ...formData, positionId: value })}
                  disabled={!formData.areaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.areaId ? "Selecione" : "Selecione uma area primeiro"}>
                      {formData.positionId ? getPositionName(formData.positionId) : (formData.areaId ? "Selecione" : "Selecione uma area primeiro")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {positionsQuery.data
                      ?.filter((position) =>
                        position.isGlobal || position.areas.some((a) => a.id === formData.areaId)
                      )
                      .map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}{position.isGlobal ? " (Global)" : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="seniority">Senioridade</Label>
                <Select
                  value={formData.hierarchyLevelId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hierarchyLevelId: value || "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {formData.hierarchyLevelId
                        ? hierarchyLevelsQuery.data?.find((l) => l.id === formData.hierarchyLevelId)?.name
                        : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchyLevelsQuery.data?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="ndaStatus">NDA</Label>
                <Select
                  value={formData.ndaStatus}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, ndaStatus: value as "SIGNED" | "NOT_SIGNED" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                    <SelectItem value="SIGNED">Assinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contractStatus">Contrato</Label>
                <Select
                  value={formData.contractStatus}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, contractStatus: value as "SIGNED" | "NOT_SIGNED" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                    <SelectItem value="SIGNED">Assinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Prestador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Prestador</DialogTitle>
            <DialogDescription>
              Atualize os dados do prestador de servico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome completo"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-salary">Salario *</Label>
                <Input
                  id="edit-salary"
                  type="number"
                  step="0.01"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="0,00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-startDate">Data de Inicio *</Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-birthDate">Data de Nascimento</Label>
                <Input
                  id="edit-birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-area">Area *</Label>
                <Select
                  value={formData.areaId}
                  onValueChange={(value) => {
                    if (value) {
                      // Verifica se o cargo atual esta disponivel na nova area
                      const currentPositionAvailable = positionsQuery.data?.some(
                        (p) =>
                          p.id === formData.positionId &&
                          (p.isGlobal || p.areas.some((a) => a.id === value))
                      );
                      // Limpa o cargo se nao estiver disponivel na nova area
                      setFormData({
                        ...formData,
                        areaId: value,
                        positionId: currentPositionAvailable ? formData.positionId : "",
                      });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {formData.areaId ? getAreaName(formData.areaId) : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {areasQuery.data?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-position">Cargo *</Label>
                <Select
                  value={formData.positionId}
                  onValueChange={(value) => value && setFormData({ ...formData, positionId: value })}
                  disabled={!formData.areaId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.areaId ? "Selecione" : "Selecione uma area primeiro"}>
                      {formData.positionId ? getPositionName(formData.positionId) : (formData.areaId ? "Selecione" : "Selecione uma area primeiro")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {positionsQuery.data
                      ?.filter((position) =>
                        position.isGlobal || position.areas.some((a) => a.id === formData.areaId)
                      )
                      .map((position) => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}{position.isGlobal ? " (Global)" : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-seniority">Senioridade</Label>
                <Select
                  value={formData.hierarchyLevelId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, hierarchyLevelId: value || "" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione">
                      {formData.hierarchyLevelId
                        ? hierarchyLevelsQuery.data?.find((l) => l.id === formData.hierarchyLevelId)?.name
                        : "Selecione"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {hierarchyLevelsQuery.data?.map((level) => (
                      <SelectItem key={level.id} value={level.id}>
                        {level.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-ndaStatus">NDA</Label>
                <Select
                  value={formData.ndaStatus}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, ndaStatus: value as "SIGNED" | "NOT_SIGNED" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                    <SelectItem value="SIGNED">Assinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-contractStatus">Contrato</Label>
                <Select
                  value={formData.contractStatus}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, contractStatus: value as "SIGNED" | "NOT_SIGNED" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_SIGNED">Pendente</SelectItem>
                    <SelectItem value="SIGNED">Assinado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar Alteracoes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusao</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o prestador{" "}
              <span className="font-semibold">{selectedProvider?.name}</span>? Esta acao nao pode
              ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
