"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X, Shield, User, Plus, Edit, Key } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type UserSelections = {
  areaId: string;
  positionId: string;
  hierarchyLevelId: string;
  isAdmin: boolean;
};

type CreateUserForm = {
  name: string;
  email: string;
  password: string;
  positionId: string;
  hierarchyLevelId: string;
  areaId: string;
  isAdmin: boolean;
  providerId: string;
  // Campos para criar como prestador
  createAsProvider: boolean;
  salary: string;
  startDate: string;
  seniority: "JUNIOR" | "MID" | "SENIOR" | "LEAD" | "PRINCIPAL" | "NA";
  ndaStatus: "SIGNED" | "NOT_SIGNED";
  contractStatus: "SIGNED" | "NOT_SIGNED";
};

type EditUserForm = {
  userId: string;
  name: string;
  email: string;
  areaId: string;
  positionId: string;
  hierarchyLevelId: string;
  isAdmin: boolean;
  status: "PENDING" | "ACTIVE" | "REJECTED" | "DISABLED";
  newPassword: string;
  providerId: string;
};

type UserData = {
  id: string;
  name: string;
  email: string;
  status: string;
  isAdmin: boolean;
  position: { id: string; name: string } | null;
  hierarchyLevel: { id: string; name: string; level: number } | null;
  area: { id: string; name: string } | null;
  provider: {
    id: string;
    name: string;
    hierarchyLevel: { id: string; name: string; level: number } | null;
  } | null;
  createdAt: string | Date;
};

export default function AdminUsuariosPage() {
  const queryClient = useQueryClient();
  // Track selections per user ID to avoid shared state bug
  const [userSelections, setUserSelections] = useState<Record<string, UserSelections>>({});

  // Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: "",
    email: "",
    password: "",
    positionId: "",
    hierarchyLevelId: "",
    areaId: "",
    isAdmin: false,
    providerId: "",
    // Campos prestador
    createAsProvider: false,
    salary: "",
    startDate: new Date().toISOString().split("T")[0],
    seniority: "NA",
    ndaStatus: "NOT_SIGNED",
    contractStatus: "NOT_SIGNED",
  });

  // Edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<EditUserForm>({
    userId: "",
    name: "",
    email: "",
    areaId: "",
    positionId: "",
    hierarchyLevelId: "",
    isAdmin: false,
    status: "ACTIVE",
    newPassword: "",
    providerId: "",
  });

  // Helper to get selections for a specific user
  const getSelectionsForUser = (userId: string): UserSelections => {
    return userSelections[userId] || { areaId: "", positionId: "", hierarchyLevelId: "", isAdmin: false };
  };

  // Helper to update selections for a specific user
  const updateUserSelections = (userId: string, updates: Partial<UserSelections>) => {
    setUserSelections((prev) => ({
      ...prev,
      [userId]: {
        ...getSelectionsForUser(userId),
        ...updates,
      },
    }));
  };

  // Queries
  const usersQuery = useQuery(trpc.user.list.queryOptions());
  const pendingUsersQuery = useQuery(trpc.user.listPending.queryOptions());
  const areasQuery = useQuery(trpc.area.list.queryOptions());
  const positionsQuery = useQuery(trpc.position.list.queryOptions());
  const hierarchyLevelsQuery = useQuery(trpc.hierarchyLevel.list.queryOptions());
  const unlinkedProvidersQuery = useQuery(trpc.provider.listUnlinked.queryOptions());

  // Query para prestadores disponiveis para o usuario sendo editado
  const availableProvidersQuery = useQuery({
    ...trpc.provider.listAvailableForUser.queryOptions({ userId: editForm.userId }),
    enabled: isEditModalOpen && !!editForm.userId,
  });

  // Mutations
  const approveMutation = useMutation(
    trpc.user.approve.mutationOptions({
      onSuccess: (_, variables) => {
        toast.success("Usuario aprovado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.user.listPending.queryKey() });
        // Clear selections for the approved user
        setUserSelections((prev) => {
          const { [variables.userId]: _, ...rest } = prev;
          return rest;
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.user.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario rejeitado!");
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.user.listPending.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const createUserMutation = useMutation(
    trpc.user.createByAdmin.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario criado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.provider.listUnlinked.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
        setIsCreateModalOpen(false);
        setCreateForm({
          name: "",
          email: "",
          password: "",
          positionId: "",
          hierarchyLevelId: "",
          areaId: "",
          isAdmin: false,
          providerId: "",
          createAsProvider: false,
          salary: "",
          startDate: new Date().toISOString().split("T")[0],
          seniority: "NA",
          ndaStatus: "NOT_SIGNED",
          contractStatus: "NOT_SIGNED",
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateUserMutation = useMutation(
    trpc.user.update.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.user.listPending.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.provider.listUnlinked.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.provider.list.queryKey() });
        setIsEditModalOpen(false);
        setEditForm({
          userId: "",
          name: "",
          email: "",
          areaId: "",
          positionId: "",
          hierarchyLevelId: "",
          isAdmin: false,
          status: "ACTIVE",
          newPassword: "",
          providerId: "",
        });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const setPasswordMutation = useMutation(
    trpc.user.setPassword.mutationOptions({
      onSuccess: () => {
        toast.success("Senha alterada com sucesso!");
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleApprove = (userId: string) => {
    const selections = getSelectionsForUser(userId);
    approveMutation.mutate({
      userId,
      positionId: selections.positionId || undefined,
      hierarchyLevelId: selections.hierarchyLevelId || undefined,
      areaId: selections.areaId || undefined,
      isAdmin: selections.isAdmin,
    });
  };

  const handleReject = (userId: string) => {
    rejectMutation.mutate({ userId });
  };

  const handleCreateUser = () => {
    if (!createForm.name || !createForm.email || !createForm.password) {
      toast.error("Preencha nome, email e senha");
      return;
    }
    if (createForm.password.length < 8) {
      toast.error("Senha deve ter no minimo 8 caracteres");
      return;
    }
    // Validacoes extras para criar como prestador
    if (createForm.createAsProvider) {
      if (!createForm.areaId) {
        toast.error("Area e obrigatoria para criar como prestador");
        return;
      }
      if (!createForm.positionId) {
        toast.error("Cargo e obrigatorio para criar como prestador");
        return;
      }
      if (!createForm.salary || parseFloat(createForm.salary) <= 0) {
        toast.error("Salario e obrigatorio para criar como prestador");
        return;
      }
    }
    createUserMutation.mutate({
      name: createForm.name,
      email: createForm.email,
      password: createForm.password,
      positionId: createForm.positionId || undefined,
      hierarchyLevelId: createForm.hierarchyLevelId || undefined,
      areaId: createForm.areaId || undefined,
      isAdmin: createForm.isAdmin,
      providerId: createForm.providerId || undefined,
      createAsProvider: createForm.createAsProvider,
      providerData: createForm.createAsProvider
        ? {
            salary: parseFloat(createForm.salary),
            startDate: createForm.startDate,
            seniority: createForm.seniority,
            ndaStatus: createForm.ndaStatus,
            contractStatus: createForm.contractStatus,
          }
        : undefined,
    });
  };

  const openEditModal = (user: UserData) => {
    setEditForm({
      userId: user.id,
      name: user.name,
      email: user.email,
      areaId: user.area?.id || "",
      positionId: user.position?.id || "",
      hierarchyLevelId: user.hierarchyLevel?.id || "",
      isAdmin: user.isAdmin,
      status: user.status as "PENDING" | "ACTIVE" | "REJECTED" | "DISABLED",
      newPassword: "",
      providerId: user.provider?.id || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateUser = async () => {
    // Buscar o provider atual do usuario para comparar
    const currentUser = usersQuery.data?.find((u) => u.id === editForm.userId);
    const currentProviderId = currentUser?.provider?.id || "";

    // Atualiza dados do usuario
    updateUserMutation.mutate({
      userId: editForm.userId,
      name: editForm.name,
      areaId: editForm.areaId || undefined,
      positionId: editForm.positionId || undefined,
      hierarchyLevelId: editForm.hierarchyLevelId || undefined,
      isAdmin: editForm.isAdmin,
      status: editForm.status,
      // So envia providerId se mudou (incluindo desvincular com null)
      providerId: editForm.providerId !== currentProviderId
        ? (editForm.providerId || null)
        : undefined,
    });

    // Se informou nova senha, altera separadamente
    if (editForm.newPassword && editForm.newPassword.length >= 8) {
      setPasswordMutation.mutate({
        userId: editForm.userId,
        newPassword: editForm.newPassword,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
            Ativo
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            Pendente
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:bg-red-900/30 dark:text-red-400">
            Rejeitado
          </span>
        );
      case "DISABLED":
        return (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
            Desativado
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">
            Gerencie usuarios do sistema e aprove novos cadastros
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar Usuario
        </Button>
      </div>

      {/* Modal Criar Usuario */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Criar Novo Usuario</h2>

            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome completo *</Label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Nome do usuario"
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email *</Label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="email@exemplo.com"
                />
              </div>

              {/* Senha */}
              <div className="space-y-2">
                <Label>Senha * (minimo 8 caracteres)</Label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Senha"
                />
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label>Area</Label>
                <select
                  value={createForm.areaId}
                  onChange={(e) => {
                    const newAreaId = e.target.value;
                    // Limpa o cargo quando a area muda
                    setCreateForm({ ...createForm, areaId: newAreaId, positionId: "" });
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma area</option>
                  {areasQuery.data?.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label>Cargo</Label>
                <select
                  value={createForm.positionId}
                  onChange={(e) => setCreateForm({ ...createForm, positionId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={!createForm.areaId}
                >
                  <option value="">{createForm.areaId ? "Selecione um cargo" : "Selecione uma area primeiro"}</option>
                  {createForm.areaId && positionsQuery.data
                    ?.filter((position) =>
                      position.isGlobal || position.areas.some((a) => a.id === createForm.areaId)
                    )
                    .map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}{position.isGlobal ? " - Global" : ""}
                      </option>
                    ))}
                </select>
                {createForm.areaId && !positionsQuery.data?.some(
                  (p) => p.isGlobal || p.areas.some((a) => a.id === createForm.areaId)
                ) && (
                  <p className="text-xs text-amber-600">
                    Nenhum cargo configurado para esta area
                  </p>
                )}
              </div>

              {/* Nivel Hierarquico */}
              <div className="space-y-2">
                <Label>Nivel Hierarquico</Label>
                <select
                  value={createForm.hierarchyLevelId}
                  onChange={(e) => setCreateForm({ ...createForm, hierarchyLevelId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={hierarchyLevelsQuery.isLoading}
                >
                  <option value="">
                    {hierarchyLevelsQuery.isLoading
                      ? "Carregando niveis..."
                      : hierarchyLevelsQuery.isError
                        ? "Erro ao carregar niveis"
                        : "Selecione um nivel"}
                  </option>
                  {hierarchyLevelsQuery.data?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} (nivel {level.level})
                      {level.canApprove ? " - Pode aprovar" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Define a senioridade para aprovacoes (ex: Junior, Senior, Diretor)
                  {hierarchyLevelsQuery.data && ` (${hierarchyLevelsQuery.data.length} disponiveis)`}
                </p>
              </div>

              {/* Admin */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={createForm.isAdmin}
                    onCheckedChange={(checked) =>
                      setCreateForm({ ...createForm, isAdmin: !!checked })
                    }
                  />
                  <span className="text-sm font-medium">Tornar Administrador</span>
                </label>
              </div>

              {/* Criar como Prestador */}
              <div className="space-y-4 pt-4 border-t">
                <div>
                  <label className={`flex items-center gap-2 ${createForm.providerId ? "cursor-not-allowed" : "cursor-pointer"}`}>
                    <Checkbox
                      checked={createForm.createAsProvider}
                      disabled={!!createForm.providerId}
                      onCheckedChange={(checked) =>
                        setCreateForm({
                          ...createForm,
                          createAsProvider: !!checked,
                          providerId: checked ? "" : createForm.providerId,
                        })
                      }
                    />
                    <span className={`text-sm font-medium ${createForm.providerId ? "text-muted-foreground" : ""}`}>Criar tambem como Prestador</span>
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cria um registro de prestador vinculado a este usuario
                  </p>
                </div>

                {createForm.createAsProvider && (
                  <div className="space-y-4 p-4 rounded-lg bg-muted/50">
                    <p className="text-sm font-medium text-muted-foreground">
                      Dados do Prestador (nome, area e cargo serao herdados do usuario)
                    </p>

                    {/* Salario */}
                    <div className="space-y-2">
                      <Label>Salario (R$) *</Label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={createForm.salary}
                        onChange={(e) => setCreateForm({ ...createForm, salary: e.target.value })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="0.00"
                      />
                    </div>

                    {/* Data de Inicio */}
                    <div className="space-y-2">
                      <Label>Data de Inicio *</Label>
                      <input
                        type="date"
                        value={createForm.startDate}
                        onChange={(e) => setCreateForm({ ...createForm, startDate: e.target.value })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      />
                    </div>

                    {/* Senioridade */}
                    <div className="space-y-2">
                      <Label>Senioridade</Label>
                      <select
                        value={createForm.seniority}
                        onChange={(e) => setCreateForm({ ...createForm, seniority: e.target.value as CreateUserForm["seniority"] })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="NA">N/A</option>
                        <option value="JUNIOR">Junior</option>
                        <option value="MID">Pleno</option>
                        <option value="SENIOR">Senior</option>
                        <option value="LEAD">Lead</option>
                        <option value="PRINCIPAL">Principal</option>
                      </select>
                    </div>

                    {/* Status NDA */}
                    <div className="space-y-2">
                      <Label>Status NDA</Label>
                      <select
                        value={createForm.ndaStatus}
                        onChange={(e) => setCreateForm({ ...createForm, ndaStatus: e.target.value as CreateUserForm["ndaStatus"] })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="NOT_SIGNED">Nao Assinado</option>
                        <option value="SIGNED">Assinado</option>
                      </select>
                    </div>

                    {/* Status Contrato */}
                    <div className="space-y-2">
                      <Label>Status Contrato</Label>
                      <select
                        value={createForm.contractStatus}
                        onChange={(e) => setCreateForm({ ...createForm, contractStatus: e.target.value as CreateUserForm["contractStatus"] })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="NOT_SIGNED">Nao Assinado</option>
                        <option value="SIGNED">Assinado</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Vincular a Prestador Existente (apenas se nao estiver criando como prestador) */}
                {!createForm.createAsProvider && (
                  <div className="space-y-2">
                    <Label>Ou vincular a Prestador existente</Label>
                    <select
                      value={createForm.providerId}
                      onChange={(e) => setCreateForm({ ...createForm, providerId: e.target.value })}
                      className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    >
                      <option value="">Nenhum</option>
                      {unlinkedProvidersQuery.data?.map((provider) => (
                        <option key={provider.id} value={provider.id}>
                          {provider.name} - {provider.area.name} ({provider.position.name})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Apenas prestadores ativos sem usuario vinculado
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={createUserMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateUser}
                disabled={createUserMutation.isPending}
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Criando...
                  </>
                ) : (
                  "Criar Usuario"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Usuario */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Editar Usuario</h2>

            <div className="space-y-4">
              {/* Nome */}
              <div className="space-y-2">
                <Label>Nome completo</Label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Nome do usuario"
                />
              </div>

              {/* Email (somente leitura) */}
              <div className="space-y-2">
                <Label>Email</Label>
                <input
                  type="email"
                  value={editForm.email}
                  disabled
                  className="w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground">
                  O email nao pode ser alterado
                </p>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as EditUserForm["status"] })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="ACTIVE">Ativo</option>
                  <option value="PENDING">Pendente</option>
                  <option value="DISABLED">Desativado</option>
                  <option value="REJECTED">Rejeitado</option>
                </select>
              </div>

              {/* Area */}
              <div className="space-y-2">
                <Label>Area</Label>
                <select
                  value={editForm.areaId}
                  onChange={(e) => {
                    const newAreaId = e.target.value;
                    // Limpa o cargo quando a area muda
                    setEditForm({ ...editForm, areaId: newAreaId, positionId: "" });
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Selecione uma area</option>
                  {areasQuery.data?.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label>Cargo</Label>
                <select
                  value={editForm.positionId}
                  onChange={(e) => setEditForm({ ...editForm, positionId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={!editForm.areaId}
                >
                  <option value="">{editForm.areaId ? "Selecione um cargo" : "Selecione uma area primeiro"}</option>
                  {editForm.areaId && positionsQuery.data
                    ?.filter((position) =>
                      position.isGlobal || position.areas.some((a) => a.id === editForm.areaId)
                    )
                    .map((position) => (
                      <option key={position.id} value={position.id}>
                        {position.name}{position.isGlobal ? " - Global" : ""}
                      </option>
                    ))}
                </select>
              </div>

              {/* Nivel Hierarquico */}
              <div className="space-y-2">
                <Label>Nivel Hierarquico</Label>
                <select
                  value={editForm.hierarchyLevelId}
                  onChange={(e) => setEditForm({ ...editForm, hierarchyLevelId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  disabled={hierarchyLevelsQuery.isLoading}
                >
                  <option value="">
                    {hierarchyLevelsQuery.isLoading
                      ? "Carregando niveis..."
                      : hierarchyLevelsQuery.isError
                        ? "Erro ao carregar niveis"
                        : "Selecione um nivel"}
                  </option>
                  {hierarchyLevelsQuery.data?.map((level) => (
                    <option key={level.id} value={level.id}>
                      {level.name} (nivel {level.level})
                      {level.canApprove ? " - Pode aprovar" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Define a senioridade para aprovacoes
                  {hierarchyLevelsQuery.data && ` (${hierarchyLevelsQuery.data.length} disponiveis)`}
                </p>
              </div>

              {/* Admin */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={editForm.isAdmin}
                    onCheckedChange={(checked) =>
                      setEditForm({ ...editForm, isAdmin: !!checked })
                    }
                  />
                  <span className="text-sm font-medium">Administrador</span>
                </label>
              </div>

              {/* Vincular a Prestador */}
              <div className="space-y-2 pt-4 border-t">
                <Label>Vincular a Prestador</Label>
                <select
                  value={editForm.providerId}
                  onChange={(e) => setEditForm({ ...editForm, providerId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Nenhum (desvincular)</option>
                  {availableProvidersQuery.data?.map((provider) => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - {provider.area.name} ({provider.position.name})
                      {provider.isLinkedToThisUser ? " - Atual" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Ao vincular, a area e cargo do usuario serao sincronizados com o prestador
                </p>
              </div>

              {/* Nova Senha */}
              <div className="space-y-2 pt-4 border-t">
                <Label className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Alterar Senha (opcional)
                </Label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  placeholder="Nova senha (minimo 8 caracteres)"
                />
                <p className="text-xs text-muted-foreground">
                  Deixe em branco para manter a senha atual
                </p>
                {editForm.newPassword && editForm.newPassword.length > 0 && editForm.newPassword.length < 8 && (
                  <p className="text-xs text-red-500">
                    A senha deve ter no minimo 8 caracteres
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
                disabled={updateUserMutation.isPending || setPasswordMutation.isPending}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpdateUser}
                disabled={updateUserMutation.isPending || setPasswordMutation.isPending || (editForm.newPassword.length > 0 && editForm.newPassword.length < 8)}
              >
                {updateUserMutation.isPending || setPasswordMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  "Salvar Alteracoes"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Usuarios Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Usuarios Pendentes
          </CardTitle>
          <CardDescription>
            Usuarios aguardando aprovacao de acesso ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingUsersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : pendingUsersQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuario pendente de aprovacao
            </div>
          ) : (
            <div className="space-y-4">
              {pendingUsersQuery.data?.map((user) => (
                <div
                  key={user.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>

                    {/* Seletor de Area */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium">Area:</Label>
                      <select
                        value={getSelectionsForUser(user.id).areaId}
                        onChange={(e) => {
                          const newAreaId = e.target.value;
                          // Limpa o cargo quando a area muda
                          updateUserSelections(user.id, { areaId: newAreaId, positionId: "" });
                        }}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Selecione uma area</option>
                        {areasQuery.data?.map((area) => (
                          <option key={area.id} value={area.id}>
                            {area.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Seletor de Cargo */}
                    <div className="mt-2 space-y-2">
                      <Label className="text-sm font-medium">Cargo:</Label>
                      <select
                        value={getSelectionsForUser(user.id).positionId}
                        onChange={(e) => updateUserSelections(user.id, { positionId: e.target.value })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        disabled={!getSelectionsForUser(user.id).areaId}
                      >
                        <option value="">
                          {getSelectionsForUser(user.id).areaId
                            ? "Selecione um cargo"
                            : "Selecione uma area primeiro"}
                        </option>
                        {getSelectionsForUser(user.id).areaId &&
                          positionsQuery.data
                            ?.filter((position) =>
                              position.isGlobal ||
                              position.areas.some((a) => a.id === getSelectionsForUser(user.id).areaId)
                            )
                            .map((position) => (
                              <option key={position.id} value={position.id}>
                                {position.name}{position.isGlobal ? " - Global" : ""}
                              </option>
                            ))}
                      </select>
                    </div>

                    {/* Seletor de Nivel Hierarquico */}
                    <div className="mt-2 space-y-2">
                      <Label className="text-sm font-medium">Nivel Hierarquico:</Label>
                      <select
                        value={getSelectionsForUser(user.id).hierarchyLevelId}
                        onChange={(e) => updateUserSelections(user.id, { hierarchyLevelId: e.target.value })}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                        disabled={hierarchyLevelsQuery.isLoading}
                      >
                        <option value="">
                          {hierarchyLevelsQuery.isLoading
                            ? "Carregando..."
                            : hierarchyLevelsQuery.isError
                              ? "Erro"
                              : "Selecione um nivel"}
                        </option>
                        {hierarchyLevelsQuery.data?.map((level) => (
                          <option key={level.id} value={level.id}>
                            {level.name} (nivel {level.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tornar Admin */}
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={getSelectionsForUser(user.id).isAdmin}
                          onCheckedChange={(checked) =>
                            updateUserSelections(user.id, { isAdmin: !!checked })
                          }
                        />
                        <span className="text-sm font-medium">Tornar Administrador</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleReject(user.id)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(user.id)}
                      disabled={approveMutation.isPending}
                    >
                      {approveMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Todos os Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Todos os Usuarios
          </CardTitle>
          <CardDescription>
            Lista completa de usuarios cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {usersQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : usersQuery.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuario cadastrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium">Nome</th>
                    <th className="pb-3 font-medium">Email</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Area</th>
                    <th className="pb-3 font-medium">Cargo</th>
                    <th className="pb-3 font-medium">Nivel</th>
                    <th className="pb-3 font-medium">Prestador</th>
                    <th className="pb-3 font-medium">Admin</th>
                    <th className="pb-3 font-medium w-[70px]">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">{user.name}</td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3">{getStatusBadge(user.status)}</td>
                      <td className="py-3">{user.area?.name || "-"}</td>
                      <td className="py-3">{user.position?.name || "-"}</td>
                      <td className="py-3">
                        {(user.provider?.hierarchyLevel || user.hierarchyLevel) ? (
                          <Badge variant="outline" className="text-xs">
                            {user.provider?.hierarchyLevel?.name || user.hierarchyLevel?.name}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3">
                        {user.provider ? (
                          <Badge variant="secondary" className="text-xs">
                            {user.provider.name}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3">
                        {user.isAdmin ? (
                          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                            Sim
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(user as UserData)}
                          title="Editar usuario"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
