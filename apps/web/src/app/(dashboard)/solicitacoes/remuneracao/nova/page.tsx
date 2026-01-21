"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowUpRight, DollarSign, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function NewRemunerationPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    providerId: "",
    newSalary: "",
    effectiveDate: "",
    priority: "" as "HIGH" | "MEDIUM" | "LOW" | "",
    reason: "",
  });

  // Query para listar prestadores
  const providersQuery = useQuery(trpc.remuneration.listProviders.queryOptions());

  // Mutation
  const createMutation = useMutation(
    trpc.remuneration.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Solicitação de mudança de remuneração criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.remuneration.list.queryKey() });
        router.push(`/solicitacoes/remuneracao/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const selectedProvider = providersQuery.data?.find(
    (p) => p.id === formData.providerId
  );

  const calculatePercentChange = () => {
    if (!selectedProvider || !formData.newSalary) return 0;
    const newValue = parseFloat(formData.newSalary.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(newValue) || selectedProvider.salary === 0) return 0;
    return ((newValue - selectedProvider.salary) / selectedProvider.salary) * 100;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.providerId) {
      toast.error("Selecione um prestador");
      return;
    }

    if (!formData.newSalary) {
      toast.error("Informe o novo salário");
      return;
    }

    if (!formData.effectiveDate) {
      toast.error("Informe a data de vigência");
      return;
    }

    if (!formData.priority) {
      toast.error("Selecione a prioridade");
      return;
    }

    if (!formData.reason || formData.reason.length < 10) {
      toast.error("A justificativa deve ter pelo menos 10 caracteres");
      return;
    }

    const newSalary = parseFloat(formData.newSalary.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(newSalary) || newSalary <= 0) {
      toast.error("Valor de salário inválido");
      return;
    }

    createMutation.mutate({
      providerId: formData.providerId,
      newSalary,
      effectiveDate: formData.effectiveDate,
      priority: formData.priority,
      reason: formData.reason,
    });
  };

  const percentChange = calculatePercentChange();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/remuneracao">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite uma mudança de remuneração
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {/* Dados do Prestador */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Prestador</CardTitle>
            <CardDescription>
              Selecione o prestador e visualize o salário atual
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
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedProvider.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedProvider.position.name} - {selectedProvider.area.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-background rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Salário Atual</p>
                    <p className="text-lg font-bold">{formatCurrency(selectedProvider.salary)}</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Nova Remuneração</CardTitle>
              <CardDescription>
                Preencha os dados da alteração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newSalary">Novo Salário *</Label>
                <Input
                  id="newSalary"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.newSalary}
                  onChange={(e) =>
                    setFormData({ ...formData, newSalary: e.target.value })
                  }
                  required
                />
              </div>

              {selectedProvider && formData.newSalary && percentChange !== 0 && (
                <div className="p-3 bg-green-50 rounded-xl flex items-center justify-between">
                  <span className="text-sm text-green-700">Variação</span>
                  <div className="flex items-center gap-1 text-green-700 font-medium">
                    <ArrowUpRight className="h-4 w-4" />
                    <span>+{percentChange.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="effectiveDate">Data de Vigência *</Label>
                <Input
                  id="effectiveDate"
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) =>
                    setFormData({ ...formData, effectiveDate: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  A data deve ser futura
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Prioridade *</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, priority: value as "HIGH" | "MEDIUM" | "LOW" })
                  }
                >
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Selecione a prioridade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="MEDIUM">Média</SelectItem>
                    <SelectItem value="LOW">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">
                  Justificativa *{" "}
                  <span className="text-muted-foreground font-normal">
                    (mínimo 10 caracteres)
                  </span>
                </Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva o motivo da alteração de remuneração..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                  rows={4}
                  required
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.reason.length}/10 caracteres
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Solicitação"
                )}
              </Button>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
}
