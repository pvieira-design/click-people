"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, Settings } from "lucide-react";

import { trpc } from "@/utils/trpc";

import { ApprovalFlowEditor } from "@/components/approval-flow-editor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ConfiguracoesPage() {
  const statsQuery = useQuery(trpc.audit.getStats.queryOptions());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <div className="grid gap-6">
        {/* Fluxos de Aprovação */}
        <ApprovalFlowEditor />

        <div className="grid gap-6 md:grid-cols-2">
          {/* Estatísticas do Sistema */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Estatísticas do Sistema
              </CardTitle>
              <CardDescription>
                Visão geral dos dados do sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {statsQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Usuários Total</span>
                    <span className="font-medium">{statsQuery.data?.users.total || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Usuários Ativos</span>
                    <span className="font-medium text-green-600">{statsQuery.data?.users.active || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Usuários Pendentes</span>
                    <span className="font-medium text-yellow-600">{statsQuery.data?.users.pending || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prestadores Total</span>
                    <span className="font-medium">{statsQuery.data?.providers.total || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Prestadores Ativos</span>
                    <span className="font-medium text-green-600">{statsQuery.data?.providers.active || 0}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Áreas</span>
                    <span className="font-medium">{statsQuery.data?.areas || 0}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Cargos</span>
                    <span className="font-medium">{statsQuery.data?.positions || 0}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Configurações Gerais */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>
                Informações sobre o comportamento do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Auto-aprovação</Label>
                  <p className="text-sm text-muted-foreground">
                    Auto-aprovação está desativada. Todas as etapas de aprovação
                    requerem aprovação manual pelo responsável da área.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Fluxos Configuráveis</Label>
                  <p className="text-sm text-muted-foreground">
                    Os fluxos de aprovação podem ser configurados acima.
                    A primeira etapa é sempre a área da solicitação e não pode ser alterada.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Informações do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
            <CardDescription>
              Detalhes técnicos da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">Versão</p>
                <p className="text-lg font-semibold">1.1.0</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">Ambiente</p>
                <p className="text-lg font-semibold">Produção</p>
              </div>
              <div className="p-4 bg-muted rounded-xl">
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="text-lg font-semibold">20/01/2026</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
