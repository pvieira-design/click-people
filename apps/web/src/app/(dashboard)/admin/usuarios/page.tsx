"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, X, Shield, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function AdminUsuariosPage() {
  const queryClient = useQueryClient();
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>("");
  const [makeAdmin, setMakeAdmin] = useState(false);

  // Queries
  const usersQuery = useQuery(trpc.user.list.queryOptions());
  const pendingUsersQuery = useQuery(trpc.user.listPending.queryOptions());
  const areasQuery = useQuery(trpc.area.list.queryOptions());
  const positionsQuery = useQuery(trpc.position.list.queryOptions());

  // Mutations
  const approveMutation = useMutation(
    trpc.user.approve.mutationOptions({
      onSuccess: () => {
        toast.success("Usuario aprovado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.user.list.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.user.listPending.queryKey() });
        setSelectedAreas([]);
        setSelectedPosition("");
        setMakeAdmin(false);
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

  const handleApprove = (userId: string) => {
    approveMutation.mutate({
      userId,
      positionId: selectedPosition || undefined,
      areaIds: selectedAreas.length > 0 ? selectedAreas : undefined,
      isAdmin: makeAdmin,
    });
  };

  const handleReject = (userId: string) => {
    rejectMutation.mutate({ userId });
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
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Usuarios</h1>
        <p className="text-muted-foreground">
          Gerencie usuarios do sistema e aprove novos cadastros
        </p>
      </div>

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

                    {/* Seletor de Areas */}
                    <div className="mt-4 space-y-2">
                      <Label className="text-sm font-medium">Areas:</Label>
                      <div className="flex flex-wrap gap-2">
                        {areasQuery.data?.map((area) => (
                          <label
                            key={area.id}
                            className="flex items-center gap-2 rounded-md border px-2 py-1 cursor-pointer hover:bg-muted"
                          >
                            <Checkbox
                              checked={selectedAreas.includes(area.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedAreas([...selectedAreas, area.id]);
                                } else {
                                  setSelectedAreas(selectedAreas.filter((id) => id !== area.id));
                                }
                              }}
                            />
                            <span className="text-sm">{area.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Seletor de Cargo */}
                    <div className="mt-2 space-y-2">
                      <Label className="text-sm font-medium">Cargo:</Label>
                      <select
                        value={selectedPosition}
                        onChange={(e) => setSelectedPosition(e.target.value)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                      >
                        <option value="">Selecione um cargo</option>
                        {positionsQuery.data?.map((position) => (
                          <option key={position.id} value={position.id}>
                            {position.name} (Nivel {position.level})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Tornar Admin */}
                    <div className="mt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <Checkbox
                          checked={makeAdmin}
                          onCheckedChange={(checked) => setMakeAdmin(!!checked)}
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
                    <th className="pb-3 font-medium">Cargo</th>
                    <th className="pb-3 font-medium">Areas</th>
                    <th className="pb-3 font-medium">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {usersQuery.data?.map((user) => (
                    <tr key={user.id} className="border-b last:border-0">
                      <td className="py-3">{user.name}</td>
                      <td className="py-3 text-muted-foreground">{user.email}</td>
                      <td className="py-3">{getStatusBadge(user.status)}</td>
                      <td className="py-3">{user.position?.name || "-"}</td>
                      <td className="py-3">
                        {user.areas.length > 0
                          ? user.areas.map((a) => a.name).join(", ")
                          : "-"}
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
