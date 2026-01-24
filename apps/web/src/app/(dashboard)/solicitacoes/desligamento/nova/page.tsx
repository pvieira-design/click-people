"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewTerminationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    providerId: "",
    terminationType: "" as "RESIGNATION" | "DISMISSAL" | "",
    terminationDate: "",
    reason: "",
  });

  // Query para listar prestadores
  const providersQuery = useQuery(trpc.termination.listProviders.queryOptions());

  // Mutation para criar solicitação
  const createMutation = useMutation(
    trpc.termination.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Solicitação de desligamento criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.termination.list.queryKey() });
        router.push(`/solicitacoes/desligamento/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.providerId) {
      toast.error("Selecione um prestador");
      return;
    }

    if (!formData.terminationType) {
      toast.error("Selecione o tipo de desligamento");
      return;
    }

    if (!formData.terminationDate) {
      toast.error("Informe a data de desligamento");
      return;
    }

    if (!formData.reason || formData.reason.length < 10) {
      toast.error("O motivo deve ter pelo menos 10 caracteres");
      return;
    }

    createMutation.mutate({
      providerId: formData.providerId,
      terminationType: formData.terminationType,
      terminationDate: formData.terminationDate,
      reason: formData.reason,
    });
  };

  const selectedProvider = providersQuery.data?.find(
    (p) => p.id === formData.providerId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/desligamento">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite o desligamento de um prestador
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Após a aprovação completa desta solicitação, o prestador será
            automaticamente desativado do sistema e não poderá mais ser incluído
            em novas solicitações.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados da Solicitação</CardTitle>
              <CardDescription>
                Preencha os dados do desligamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider">Prestador *</Label>
                <SearchableSelect
                  options={
                    providersQuery.data?.map((provider) => ({
                      value: provider.id,
                      label: provider.name,
                      description: `${provider.area.name} - ${provider.position.name}`,
                    })) || []
                  }
                  value={formData.providerId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, providerId: value })
                  }
                  placeholder="Buscar prestador..."
                  emptyMessage="Nenhum prestador encontrado."
                />
              </div>

              {selectedProvider && (
                <div className="p-4 bg-muted rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="font-medium">{selectedProvider.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedProvider.position.name} - {selectedProvider.area.name}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tipo de Desligamento *</Label>
                <Select
                  value={formData.terminationType}
                  onValueChange={(value) =>
                    setFormData({ ...formData, terminationType: value as "RESIGNATION" | "DISMISSAL" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RESIGNATION">Pedido de Demissão</SelectItem>
                    <SelectItem value="DISMISSAL">Demissão pela Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data Final de Desligamento *</Label>
                <Input
                  type="date"
                  value={formData.terminationDate}
                  onChange={(e) =>
                    setFormData({ ...formData, terminationDate: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Último dia de trabalho do prestador
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Motivo do Desligamento *{" "}
                  <span className="text-muted-foreground font-normal">
                    (mínimo 10 caracteres)
                  </span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva detalhadamente o motivo do desligamento..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={5}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.reason.length}/10 caracteres
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="destructive"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Solicitar Desligamento"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
