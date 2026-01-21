"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ArrowLeft, Calendar, Loader2 } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

export default function NewRecessPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    providerId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Query para listar prestadores
  const providersQuery = useQuery(trpc.recess.listProviders.queryOptions());

  // Query para histórico do prestador selecionado
  const currentYear = new Date().getFullYear();
  const historyQuery = useQuery(
    trpc.recess.getProviderHistory.queryOptions(
      { providerId: formData.providerId, year: currentYear },
      { enabled: !!formData.providerId }
    )
  );

  // Mutation para criar solicitação
  const createMutation = useMutation(
    trpc.recess.create.mutationOptions({
      onSuccess: (data) => {
        if (data.warning) {
          toast.warning(data.warning);
        } else {
          toast.success("Solicitação criada com sucesso!");
        }
        queryClient.invalidateQueries({ queryKey: trpc.recess.list.queryKey() });
        router.push(`/solicitacoes/recesso/${data.id}`);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Calcular dias
  const calculateDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end < start) return 0;
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  const daysCount = calculateDays();
  const totalDaysWithNew = (historyQuery.data?.totalDays || 0) + daysCount;
  const showWarning = totalDaysWithNew > 20;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.providerId) {
      toast.error("Selecione um prestador");
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast.error("Informe o período do recesso");
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    if (end < start) {
      toast.error("A data final deve ser maior que a data inicial");
      return;
    }

    createMutation.mutate({
      providerId: formData.providerId,
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason || undefined,
    });
  };

  const selectedProvider = providersQuery.data?.find(
    (p) => p.id === formData.providerId
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/recesso">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nova Solicitação</h1>
          <p className="text-muted-foreground">
            Solicite recesso ou férias para um prestador
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 md:grid-cols-2">
        {/* Formulário */}
        <Card>
          <CardHeader>
            <CardTitle>Dados da Solicitação</CardTitle>
            <CardDescription>
              Preencha os dados do recesso/férias
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
              <div className="p-3 bg-muted rounded-xl text-sm">
                <p>
                  <strong>Área:</strong> {selectedProvider.area.name}
                </p>
                <p>
                  <strong>Cargo:</strong> {selectedProvider.position.name}
                </p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Início *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">Data Fim *</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            {daysCount > 0 && (
              <div className="p-3 bg-primary/10 rounded-xl text-center">
                <Calendar className="h-5 w-5 mx-auto mb-1 text-primary" />
                <p className="text-2xl font-bold text-primary">{daysCount} dias</p>
                <p className="text-sm text-muted-foreground">de recesso</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea
                id="reason"
                placeholder="Descreva o motivo do recesso..."
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
              />
            </div>

            {showWarning && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                  Com esta solicitação, o prestador terá {totalDaysWithNew} dias de
                  recesso em {currentYear}. O limite recomendado é de 20 dias por ano.
                </AlertDescription>
              </Alert>
            )}

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

        {/* Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Recessos</CardTitle>
            <CardDescription>
              Recessos do prestador em {currentYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!formData.providerId ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione um prestador para ver o histórico
              </div>
            ) : historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historyQuery.data?.requests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum recesso registrado em {currentYear}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-xl text-center">
                  <p className="text-3xl font-bold">
                    {historyQuery.data?.totalDays || 0} dias
                  </p>
                  <p className="text-sm text-muted-foreground">
                    utilizados em {currentYear}
                  </p>
                </div>

                <div className="space-y-2">
                  {historyQuery.data?.requests.map((req) => (
                    <div
                      key={req.id}
                      className="p-3 border rounded-xl flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {format(new Date(req.startDate), "dd/MM", {
                            locale: ptBR,
                          })}{" "}
                          -{" "}
                          {format(new Date(req.endDate), "dd/MM", {
                            locale: ptBR,
                          })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {req.daysCount} dias
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          req.status === "APPROVED"
                            ? "bg-green-100 text-green-700"
                            : req.status === "REJECTED"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {req.status === "APPROVED"
                          ? "Aprovado"
                          : req.status === "REJECTED"
                            ? "Rejeitado"
                            : "Pendente"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
