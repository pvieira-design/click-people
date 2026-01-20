"use client";

import { useQuery } from "@tanstack/react-query";
import { Bell, Loader2, Moon, Palette, Settings, Sun, Monitor } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Theme = "light" | "dark" | "system";

export default function ConfiguracoesPage() {
  const [theme, setTheme] = useState<Theme>("system");
  const [emailApproval, setEmailApproval] = useState(true);
  const [emailSummary, setEmailSummary] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  const userQuery = useQuery(trpc.user.me.queryOptions());

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme && ["light", "dark", "system"].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Apply theme when it changes
  useEffect(() => {
    const root = document.documentElement;

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
      root.classList.remove("light", "dark");
      root.classList.add(systemTheme);
    } else {
      root.classList.remove("light", "dark");
      root.classList.add(theme);
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    toast.success(`Tema alterado para ${newTheme === "light" ? "Claro" : newTheme === "dark" ? "Escuro" : "Sistema"}`);
  };

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência no sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Aparência */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Aparência
            </CardTitle>
            <CardDescription>Personalize a aparência do sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label className="text-sm font-medium mb-3 block">Tema</Label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleThemeChange("light")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "light"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Sun className={`h-6 w-6 ${theme === "light" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === "light" ? "text-primary" : ""}`}>
                    Claro
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange("dark")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "dark"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Moon className={`h-6 w-6 ${theme === "dark" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === "dark" ? "text-primary" : ""}`}>
                    Escuro
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleThemeChange("system")}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-colors ${
                    theme === "system"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Monitor className={`h-6 w-6 ${theme === "system" ? "text-primary" : "text-muted-foreground"}`} />
                  <span className={`text-sm font-medium ${theme === "system" ? "text-primary" : ""}`}>
                    Sistema
                  </span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Modo Compacto</Label>
                <p className="text-sm text-muted-foreground">
                  Reduz o espaçamento entre elementos
                </p>
              </div>
              <Switch
                checked={compactMode}
                onCheckedChange={(checked) => {
                  setCompactMode(checked);
                  toast.success(checked ? "Modo compacto ativado" : "Modo compacto desativado");
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
            <CardDescription>Configure como deseja ser notificado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>E-mails de Aprovação</Label>
                <p className="text-sm text-muted-foreground">
                  Receber e-mail quando uma solicitação for aprovada ou rejeitada
                </p>
              </div>
              <Switch
                checked={emailApproval}
                onCheckedChange={(checked) => {
                  setEmailApproval(checked);
                  toast.success(
                    checked
                      ? "Notificações de aprovação ativadas"
                      : "Notificações de aprovação desativadas"
                  );
                }}
              />
            </div>

            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label>Resumo Semanal</Label>
                <p className="text-sm text-muted-foreground">
                  Receber um resumo semanal das atividades pendentes
                </p>
              </div>
              <Switch
                checked={emailSummary}
                onCheckedChange={(checked) => {
                  setEmailSummary(checked);
                  toast.success(
                    checked ? "Resumo semanal ativado" : "Resumo semanal desativado"
                  );
                }}
              />
            </div>

            <p className="text-xs text-muted-foreground pt-4 border-t">
              As notificações por e-mail serão enviadas para {userQuery.data?.email}
            </p>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
            <CardDescription>Detalhes da sua conta no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="text-lg font-semibold">{userQuery.data?.name}</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">E-mail</p>
                <p className="text-lg font-semibold truncate">{userQuery.data?.email}</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                <p className="text-lg font-semibold">
                  {userQuery.data?.isAdmin ? "Administrador" : "Usuário"}
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground mt-4">
              Para alterar informações da conta ou sua senha, acesse a página de{" "}
              <a href="/perfil" className="text-primary hover:underline">
                Meu Perfil
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
