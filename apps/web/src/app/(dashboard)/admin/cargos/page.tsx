"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

type Position = {
  id: string;
  name: string;
  level: number;
  canApprove: boolean;
  userCount: number;
  providerCount: number;
  createdAt: string | Date;
};

type FormData = {
  name: string;
  level: string;
  canApprove: boolean;
};

const initialFormData: FormData = {
  name: "",
  level: "10",
  canApprove: false,
};

const levelOptions = [
  { value: "10", label: "10 - Analista" },
  { value: "20", label: "20 - Analista Senior" },
  { value: "30", label: "30 - Coordenador" },
  { value: "40", label: "40 - Supervisor" },
  { value: "50", label: "50 - Gerente" },
  { value: "60", label: "60 - Gerente Senior" },
  { value: "70", label: "70 - Head" },
  { value: "80", label: "80 - Diretor" },
  { value: "90", label: "90 - Diretor RH" },
  { value: "95", label: "95 - CFO" },
  { value: "100", label: "100 - CEO" },
];

const getLevelLabel = (level: number): string => {
  const option = levelOptions.find((opt) => parseInt(opt.value) === level);
  return option ? option.label : `Nivel ${level}`;
};

const getLevelBadgeVariant = (level: number): "default" | "secondary" | "destructive" | "outline" => {
  if (level >= 80) return "default";
  if (level >= 50) return "secondary";
  return "outline";
};

export default function AdminCargosPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const positionsQuery = useQuery(trpc.position.list.queryOptions());

  // Mutations
  const createMutation = useMutation(
    trpc.position.create.mutationOptions({
      onSuccess: () => {
        toast.success("Cargo criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.position.list.queryKey() });
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.position.update.mutationOptions({
      onSuccess: () => {
        toast.success("Cargo atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.position.list.queryKey() });
        setIsEditDialogOpen(false);
        setSelectedPosition(null);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.position.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Cargo removido com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.position.list.queryKey() });
        setIsDeleteDialogOpen(false);
        setSelectedPosition(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Filter positions
  const filteredPositions = positionsQuery.data?.filter((position) =>
    position.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Preencha o nome do cargo");
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      level: parseInt(formData.level),
      canApprove: formData.canApprove,
    });
  };

  const handleUpdate = () => {
    if (!selectedPosition || !formData.name.trim()) return;
    updateMutation.mutate({
      id: selectedPosition.id,
      name: formData.name.trim(),
      level: parseInt(formData.level),
      canApprove: formData.canApprove,
    });
  };

  const handleDelete = () => {
    if (!selectedPosition) return;
    deleteMutation.mutate({ id: selectedPosition.id });
  };

  const openEditDialog = (position: Position) => {
    setSelectedPosition(position);
    setFormData({
      name: position.name,
      level: position.level.toString(),
      canApprove: position.canApprove,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (position: Position) => {
    setSelectedPosition(position);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cargos</h1>
          <p className="text-muted-foreground">
            Gerencie os cargos e niveis hierarquicos da empresa
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Cargo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Cargos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{positionsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cargos com Aprovacao</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {positionsQuery.data?.filter((p) => p.canApprove).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pessoas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(positionsQuery.data?.reduce((acc, pos) => acc + pos.userCount + pos.providerCount, 0) || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Cargos</CardTitle>
          <CardDescription>
            {filteredPositions?.length || 0} cargos encontrados (ordenados por nivel)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search */}
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Table */}
          {positionsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredPositions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum cargo encontrado
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead className="text-center">Pode Aprovar</TableHead>
                    <TableHead className="text-center">Usuarios</TableHead>
                    <TableHead className="text-center">Prestadores</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPositions?.map((position) => (
                    <TableRow key={position.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                          </div>
                          {position.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getLevelBadgeVariant(position.level)}>
                          {getLevelLabel(position.level)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {position.canApprove ? (
                          <Badge variant="default" className="bg-emerald-600">
                            Sim
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Nao</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{position.userCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{position.providerCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(position)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(position)}
                              className="text-destructive focus:text-destructive"
                              disabled={position.userCount > 0 || position.providerCount > 0}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Novo Cargo</DialogTitle>
            <DialogDescription>
              Crie um novo cargo com nivel hierarquico.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Cargo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Analista, Gerente, Diretor..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Nivel Hierarquico *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value || "10" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nivel" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O nivel determina a posicao hierarquica do cargo (maior = mais alto).
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="canApprove"
                checked={formData.canApprove}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, canApprove: !!checked })
                }
              />
              <Label htmlFor="canApprove" className="cursor-pointer">
                Pode aprovar solicitacoes
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Cargo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Cargo</DialogTitle>
            <DialogDescription>
              Atualize os dados do cargo.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome do Cargo *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Analista, Gerente, Diretor..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level">Nivel Hierarquico *</Label>
              <Select
                value={formData.level}
                onValueChange={(value) => setFormData({ ...formData, level: value || "10" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nivel" />
                </SelectTrigger>
                <SelectContent>
                  {levelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-canApprove"
                checked={formData.canApprove}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, canApprove: !!checked })
                }
              />
              <Label htmlFor="edit-canApprove" className="cursor-pointer">
                Pode aprovar solicitacoes
              </Label>
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
              {selectedPosition &&
              (selectedPosition.userCount > 0 || selectedPosition.providerCount > 0) ? (
                <span className="text-destructive">
                  Nao e possivel excluir o cargo{" "}
                  <span className="font-semibold">{selectedPosition?.name}</span> pois existem
                  usuarios ou prestadores vinculados.
                </span>
              ) : (
                <>
                  Tem certeza que deseja excluir o cargo{" "}
                  <span className="font-semibold">{selectedPosition?.name}</span>? Esta acao nao
                  pode ser desfeita.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                deleteMutation.isPending ||
                !!(selectedPosition &&
                  (selectedPosition.userCount > 0 || selectedPosition.providerCount > 0))
              }
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
