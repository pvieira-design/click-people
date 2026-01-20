"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Home, Loader2, MoreHorizontal, Plus, Search, Trash2, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
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

type Area = {
  id: string;
  name: string;
  userCount: number;
  providerCount: number;
  createdAt: string | Date;
};

export default function AdminAreasPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedArea, setSelectedArea] = useState<Area | null>(null);
  const [formName, setFormName] = useState("");

  // Queries
  const areasQuery = useQuery(trpc.area.list.queryOptions());

  // Mutations
  const createMutation = useMutation(
    trpc.area.create.mutationOptions({
      onSuccess: () => {
        toast.success("Area criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.area.list.queryKey() });
        setIsCreateDialogOpen(false);
        setFormName("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateMutation = useMutation(
    trpc.area.update.mutationOptions({
      onSuccess: () => {
        toast.success("Area atualizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.area.list.queryKey() });
        setIsEditDialogOpen(false);
        setSelectedArea(null);
        setFormName("");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.area.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Area removida com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.area.list.queryKey() });
        setIsDeleteDialogOpen(false);
        setSelectedArea(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Filter areas
  const filteredAreas = areasQuery.data?.filter((area) =>
    area.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handlers
  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error("Preencha o nome da area");
      return;
    }
    createMutation.mutate({ name: formName.trim() });
  };

  const handleUpdate = () => {
    if (!selectedArea || !formName.trim()) return;
    updateMutation.mutate({ id: selectedArea.id, name: formName.trim() });
  };

  const handleDelete = () => {
    if (!selectedArea) return;
    deleteMutation.mutate({ id: selectedArea.id });
  };

  const openEditDialog = (area: Area) => {
    setSelectedArea(area);
    setFormName(area.name);
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (area: Area) => {
    setSelectedArea(area);
    setIsDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Areas</h1>
          <p className="text-muted-foreground">
            Gerencie as areas/departamentos da empresa
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Area
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Areas</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{areasQuery.data?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {areasQuery.data?.reduce((acc, area) => acc + area.userCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Prestadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {areasQuery.data?.reduce((acc, area) => acc + area.providerCount, 0) || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Areas</CardTitle>
          <CardDescription>
            {filteredAreas?.length || 0} areas encontradas
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
          {areasQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : areasQuery.isError ? (
            <ErrorState
              message={areasQuery.error?.message}
              onRetry={() => areasQuery.refetch()}
            />
          ) : filteredAreas?.length === 0 ? (
            <EmptyState
              icon={Home}
              title="Nenhuma area encontrada"
              description={searchTerm ? "Tente ajustar os filtros de busca" : "Comece cadastrando a primeira area"}
              action={!searchTerm ? { label: "Nova Area", onClick: () => setIsCreateDialogOpen(true) } : undefined}
            />
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead className="text-center">Usuarios</TableHead>
                    <TableHead className="text-center">Prestadores</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAreas?.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                            <Home className="h-4 w-4 text-primary" />
                          </div>
                          {area.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{area.userCount}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{area.providerCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(area)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(area)}
                              className="text-destructive focus:text-destructive"
                              disabled={area.userCount > 0 || area.providerCount > 0}
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
            <DialogTitle>Nova Area</DialogTitle>
            <DialogDescription>
              Crie uma nova area/departamento para a empresa.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome da Area *</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Tecnologia, Marketing, RH..."
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Area
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Area</DialogTitle>
            <DialogDescription>
              Atualize o nome da area.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Nome da Area *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ex: Tecnologia, Marketing, RH..."
                onKeyDown={(e) => e.key === "Enter" && handleUpdate()}
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
              {selectedArea && (selectedArea.userCount > 0 || selectedArea.providerCount > 0) ? (
                <span className="text-destructive">
                  Nao e possivel excluir a area <span className="font-semibold">{selectedArea?.name}</span> pois existem usuarios ou prestadores vinculados.
                </span>
              ) : (
                <>
                  Tem certeza que deseja excluir a area{" "}
                  <span className="font-semibold">{selectedArea?.name}</span>? Esta acao nao pode
                  ser desfeita.
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
                !!(selectedArea &&
                  (selectedArea.userCount > 0 || selectedArea.providerCount > 0))
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
