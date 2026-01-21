"use client";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Calendar,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Mail,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function getStatusBadge(status: string) {
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
}

export default function PerfilPage() {
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const userQuery = useQuery(trpc.user.me.queryOptions());

  const passwordForm = useForm({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
    onSubmit: async ({ value }) => {
      setIsChangingPassword(true);
      try {
        const result = await authClient.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        });

        if (result.error) {
          toast.error(result.error.message || "Erro ao alterar senha");
          return;
        }

        toast.success("Senha alterada com sucesso!");
        passwordForm.reset();
      } catch (error) {
        toast.error("Erro ao alterar senha. Verifique suas credenciais.");
      } finally {
        setIsChangingPassword(false);
      }
    },
    validators: {
      onSubmit: z
        .object({
          currentPassword: z.string().min(1, "Senha atual é obrigatória"),
          newPassword: z.string().min(8, "Nova senha deve ter pelo menos 8 caracteres"),
          confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
        })
        .refine((data) => data.newPassword === data.confirmPassword, {
          message: "As senhas não coincidem",
          path: ["confirmPassword"],
        }),
    },
  });

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const user = userQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Visualize suas informações e gerencie sua conta
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Informações Pessoais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
            <CardDescription>Seus dados cadastrados no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-semibold">
                {user?.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2)}
              </div>
              <div>
                <p className="text-lg font-medium">{user?.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  {getStatusBadge(user?.status || "")}
                  {user?.isAdmin && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <UserCheck className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Status da Conta</p>
                  <p className="font-medium capitalize">
                    {user?.status === "ACTIVE"
                      ? "Ativa"
                      : user?.status === "PENDING"
                        ? "Pendente de Aprovação"
                        : user?.status === "REJECTED"
                          ? "Rejeitada"
                          : "Desativada"}
                  </p>
                </div>
              </div>

              {user?.isAdmin && (
                <div className="flex items-center gap-3">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tipo de Usuário</p>
                    <p className="font-medium">Administrador do Sistema</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Informações Profissionais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações Profissionais
            </CardTitle>
            <CardDescription>Sua posição na organização</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium">
                  {user?.position?.name || (
                    <span className="text-muted-foreground italic">Não atribuído</span>
                  )}
                </p>
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground">Nivel Hierarquico</p>
                <p className="font-medium">
                  {user?.hierarchyLevel?.name || (
                    <span className="text-muted-foreground italic">Não atribuído</span>
                  )}
                </p>
                {user?.hierarchyLevel && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Nivel {user.hierarchyLevel.level}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t">
                <p className="text-sm text-muted-foreground mb-2">Área</p>
                {user?.area ? (
                  <span className="inline-flex items-center rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                    {user.area.name}
                  </span>
                ) : (
                  <p className="text-muted-foreground italic">Nenhuma área vinculada</p>
                )}
              </div>

              {user?.hierarchyLevel?.canApprove && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Shield className="h-4 w-4" />
                    <span className="text-sm font-medium">Pode aprovar solicitações</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Alterar Senha */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Segurança
            </CardTitle>
            <CardDescription>Altere sua senha de acesso</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                passwordForm.handleSubmit();
              }}
              className="space-y-4 max-w-md"
            >
              <passwordForm.Field name="currentPassword">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Senha Atual</Label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showCurrentPassword ? "text" : "password"}
                        placeholder="Digite sua senha atual"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </passwordForm.Field>

              <passwordForm.Field name="newPassword">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Digite a nova senha"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </passwordForm.Field>

              <passwordForm.Field name="confirmPassword">
                {(field) => (
                  <div className="space-y-2">
                    <Label htmlFor={field.name}>Confirmar Nova Senha</Label>
                    <div className="relative">
                      <Input
                        id={field.name}
                        name={field.name}
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirme a nova senha"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                    </div>
                    {field.state.meta.errors.map((error) => (
                      <p key={error?.message} className="text-sm text-destructive">
                        {error?.message}
                      </p>
                    ))}
                  </div>
                )}
              </passwordForm.Field>

              <passwordForm.Subscribe>
                {(state) => (
                  <Button
                    type="submit"
                    disabled={!state.canSubmit || state.isSubmitting || isChangingPassword}
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      "Alterar Senha"
                    )}
                  </Button>
                )}
              </passwordForm.Subscribe>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
