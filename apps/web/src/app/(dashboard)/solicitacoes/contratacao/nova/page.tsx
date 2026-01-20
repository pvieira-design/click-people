"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function NewHiringPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    hiringType: "" as "INCREASE" | "REPLACEMENT" | "",
    areaId: "",
    positionId: "",
    proposedSalary: "",
    expectedStartDate: "",
    priority: "" as "HIGH" | "MEDIUM" | "LOW" | "",
    reason: "",
    replacedProviderId: "",
  });

  // Queries
  const areasQuery = useQuery(trpc.hiring.listAreas.queryOptions());
  const positionsQuery = useQuery(trpc.hiring.listPositions.queryOptions());
  const providersQuery = useQuery(
    trpc.hiring.listProvidersForReplacement.queryOptions(
      { areaId: formData.areaId },
      { enabled: formData.hiringType === "REPLACEMENT" && !!formData.areaId }
    )
  );

  // Mutation
  const createMutation = useMutation(
    trpc.hiring.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Solicitação de contratação criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.hiring.list.queryKey() });
        router.push(`/solicitacoes/contratacao/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.hiringType) {
      toast.error("Selecione o tipo de contratação");
      return;
    }

    if (!formData.areaId) {
      toast.error("Selecione a área");
      return;
    }

    if (!formData.positionId) {
      toast.error("Selecione o cargo");
      return;
    }

    if (!formData.proposedSalary) {
      toast.error("Informe o salário proposto");
      return;
    }

    if (!formData.expectedStartDate) {
      toast.error("Informe a data prevista de início");
      return;
    }

    if (!formData.priority) {
      toast.error("Selecione a prioridade");
      return;
    }

    if (formData.hiringType === "REPLACEMENT" && !formData.replacedProviderId) {
      toast.error("Selecione o prestador a ser substituído");
      return;
    }

    const salary = parseFloat(formData.proposedSalary.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(salary) || salary <= 0) {
      toast.error("Valor de salário inválido");
      return;
    }

    createMutation.mutate({
      hiringType: formData.hiringType,
      areaId: formData.areaId,
      positionId: formData.positionId,
      proposedSalary: salary,
      expectedStartDate: formData.expectedStartDate,
      priority: formData.priority,
      reason: formData.reason || undefined,
      replacedProviderId: formData.replacedProviderId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/contratacao">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite uma nova contratação
          </p>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados da Solicitação</CardTitle>
              <CardDescription>
                Preencha os dados da contratação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo de Contratação */}
              <div className="space-y-2">
                <Label htmlFor="hiringType">Tipo de Contratação *</Label>
                <Select
                  value={formData.hiringType}
                  onValueChange={(value) =>
                    value && setFormData({
                      ...formData,
                      hiringType: value as "INCREASE" | "REPLACEMENT",
                      replacedProviderId: "",
                    })
                  }
                >
                  <SelectTrigger id="hiringType">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCREASE">Aumento de Quadro</SelectItem>
                    <SelectItem value="REPLACEMENT">Substituição</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Área */}
              <div className="space-y-2">
                <Label htmlFor="area">Área *</Label>
                <Select
                  value={formData.areaId}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, areaId: value, replacedProviderId: "" })
                  }
                >
                  <SelectTrigger id="area">
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areasQuery.data?.map((area) => (
                      <SelectItem key={area.id} value={area.id}>
                        {area.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cargo */}
              <div className="space-y-2">
                <Label htmlFor="position">Cargo *</Label>
                <Select
                  value={formData.positionId}
                  onValueChange={(value) =>
                    value && setFormData({ ...formData, positionId: value })
                  }
                >
                  <SelectTrigger id="position">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {positionsQuery.data?.map((position) => (
                      <SelectItem key={position.id} value={position.id}>
                        {position.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Prestador Substituído (se for substituição) */}
              {formData.hiringType === "REPLACEMENT" && formData.areaId && (
                <div className="space-y-2">
                  <Label htmlFor="replaced">Prestador a ser Substituído *</Label>
                  <Select
                    value={formData.replacedProviderId}
                    onValueChange={(value) =>
                      value && setFormData({ ...formData, replacedProviderId: value })
                    }
                  >
                    <SelectTrigger id="replaced">
                      <SelectValue placeholder="Selecione o prestador" />
                    </SelectTrigger>
                    <SelectContent>
                      {providersQuery.data?.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name} - {provider.position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Salário Proposto */}
              <div className="space-y-2">
                <Label htmlFor="salary">Salário Proposto *</Label>
                <Input
                  id="salary"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.proposedSalary}
                  onChange={(e) =>
                    setFormData({ ...formData, proposedSalary: e.target.value })
                  }
                  required
                />
              </div>

              {/* Data Prevista de Início */}
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Prevista de Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.expectedStartDate}
                  onChange={(e) =>
                    setFormData({ ...formData, expectedStartDate: e.target.value })
                  }
                  required
                />
              </div>

              {/* Prioridade */}
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

              {/* Justificativa */}
              <div className="space-y-2">
                <Label htmlFor="reason">Justificativa (opcional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Descreva a justificativa para a contratação..."
                  value={formData.reason}
                  onChange={(e) =>
                    setFormData({ ...formData, reason: e.target.value })
                  }
                />
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
