"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function NewPurchasePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    description: "",
    value: "",
    paymentDate: "",
  });

  // Query para dados do usuário atual
  const userDataQuery = useQuery(trpc.purchase.getCurrentUserData.queryOptions());

  // Mutation
  const createMutation = useMutation(
    trpc.purchase.create.mutationOptions({
      onSuccess: (data) => {
        toast.success("Solicitação de compra criada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.purchase.list.queryKey() });
        router.push(`/solicitacoes/compra/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.description || formData.description.length < 3) {
      toast.error("A descrição deve ter pelo menos 3 caracteres");
      return;
    }

    if (!formData.value) {
      toast.error("Informe o valor");
      return;
    }

    if (!formData.paymentDate) {
      toast.error("Informe a data de pagamento");
      return;
    }

    const value = parseFloat(formData.value.replace(/[^\d,]/g, "").replace(",", "."));
    if (isNaN(value) || value <= 0) {
      toast.error("Valor inválido");
      return;
    }

    createMutation.mutate({
      description: formData.description,
      value,
      paymentDate: formData.paymentDate,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/compra">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite uma compra ou despesa
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 max-w-4xl">
        {/* Dados do Solicitante */}
        <Card>
          <CardHeader>
            <CardTitle>Dados do Solicitante</CardTitle>
            <CardDescription>
              Informações preenchidas automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {userDataQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{userDataQuery.data?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {userDataQuery.data?.position} - {userDataQuery.data?.area}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Dados da Compra</CardTitle>
              <CardDescription>
                Preencha os dados da solicitação
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="description">Descrição da Despesa/Serviço *</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o que será comprado ou contratado..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="value">Valor *</Label>
                <Input
                  id="value"
                  type="text"
                  placeholder="R$ 0,00"
                  value={formData.value}
                  onChange={(e) =>
                    setFormData({ ...formData, value: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDate">Data de Pagamento *</Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={formData.paymentDate}
                  onChange={(e) =>
                    setFormData({ ...formData, paymentDate: e.target.value })
                  }
                  required
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
