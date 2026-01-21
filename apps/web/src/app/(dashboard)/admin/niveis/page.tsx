"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Users,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type HierarchyLevel = {
  id: string;
  name: string;
  level: number;
  canApprove: boolean;
  userCount: number;
};

type FormData = {
  name: string;
  level: string;
};

const initialFormData: FormData = {
  name: "",
  level: "10",
};


export default function AdminNiveisPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<HierarchyLevel | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);

  // Queries
  const levelsQuery = useQuery(trpc.hierarchyLevel.list.queryOptions());

  // Mutations
  const createMutation = useMutation(
    trpc.hierarchyLevel.create.mutationOptions({
      onSuccess: () => {
        toast.success("Senioridade criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.hierarchyLevel.list.queryKey() });
        setIsCreateDialogOpen(false);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.hierarchyLevel.update.mutationOptions({
      onSuccess: () => {
        toast.success("Senioridade atualizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.hierarchyLevel.list.queryKey() });
        setIsEditDialogOpen(false);
        setSelectedLevel(null);
        setFormData(initialFormData);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.hierarchyLevel.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Senioridade removida com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.hierarchyLevel.list.queryKey() });
        setIsDeleteDialogOpen(false);
        setSelectedLevel(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Filter levels
  const filteredLevels = levelsQuery.data?.filter((level) =>
    level.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error("Preencha o nome da senioridade");
      return;
    }
    createMutation.mutate({
      name: formData.name.trim(),
      level: parseInt(formData.level),
      canApprove: false, // Deprecated: approval is now based on area designation
    });
  };

  const handleUpdate = () => {
    if (!selectedLevel || !formData.name.trim()) return;
    updateMutation.mutate({
      id: selectedLevel.id,
      name: formData.name.trim(),
      level: parseInt(formData.level),
      canApprove: false, // Deprecated: approval is now based on area designation
    });
  };

  const handleDelete = () => {
    if (!selectedLevel) return;
    deleteMutation.mutate({ id: selectedLevel.id });
  };

  const openEditDialog = (level: HierarchyLevel) => {
    setSelectedLevel(level);
    setFormData({
      name: level.name,
      level: level.level.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (level: HierarchyLevel) => {
    setSelectedLevel(level);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Senioridades</h1>
          <p className="text-muted-foreground">
            Gerencie os niveis de senioridade dos colaboradores
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Senioridade
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Senioridades</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{levelsQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {levelsQuery.data?.reduce((acc, l) => acc + l.userCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Senioridades</CardTitle>
          <CardDescription>
            {filteredLevels?.length || 0} senioridades encontradas (ordenadas por nivel)
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
          {levelsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLevels?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma senioridade encontrada
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Usuarios</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLevels?.map((level) => (
                    <TableRow key={level.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Layers className="h-4 w-4 text-primary" />
                          </div>
                          {level.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{level.userCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(level)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(level)}
                              className="text-destructive focus:text-destructive"
                              disabled={level.userCount > 0}
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
            <DialogTitle>Nova Senioridade</DialogTitle>
            <DialogDescription>
              Crie uma nova senioridade para os colaboradores.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Senioridade *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Junior, Pleno, Senior, Lead..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Ordem de Exibicao *</Label>
              <Input
                id="level"
                type="number"
                min="1"
                max="200"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="Ex: 10, 20, 30..."
              />
              <p className="text-xs text-muted-foreground">
                O valor determina a ordem de exibicao (maior = mais alto na lista).
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Senioridade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Senioridade</DialogTitle>
            <DialogDescription>
              Atualize os dados da senioridade.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome da Senioridade *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Junior, Pleno, Senior, Lead..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level">Ordem de Exibicao *</Label>
              <Input
                id="edit-level"
                type="number"
                min="1"
                max="200"
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                placeholder="Ex: 10, 20, 30..."
              />
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
              {selectedLevel && selectedLevel.userCount > 0 ? (
                <span className="text-destructive">
                  Nao e possivel excluir a senioridade{" "}
                  <span className="font-semibold">{selectedLevel?.name}</span> pois existem
                  usuarios vinculados.
                </span>
              ) : (
                <>
                  Tem certeza que deseja excluir a senioridade{" "}
                  <span className="font-semibold">{selectedLevel?.name}</span>? Esta acao nao
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
                deleteMutation.isPending || !!(selectedLevel && selectedLevel.userCount > 0)
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
