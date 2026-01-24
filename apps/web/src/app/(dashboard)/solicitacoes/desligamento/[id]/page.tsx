"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  DollarSign,
  Loader2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { ApprovalActions } from "@/components/approval-actions";
import { ApprovalStatusBadge, ApprovalTimeline } from "@/components/approval-timeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const TERMINATION_TYPE_LABELS = {
  RESIGNATION: "Pedido de Demissão",
  DISMISSAL: "Demissão pela Empresa",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

export default function TerminationDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const queryClient = useQueryClient();

  // Query para detalhes da solicitação
  const requestQuery = useQuery(
    trpc.termination.getById.queryOptions({ id: requestId })
  );

  // Query para verificar se pode aprovar
  const canApproveQuery = useQuery(
    trpc.termination.canApprove.queryOptions({ requestId })
  );

  // Mutations
  const approveMutation = useMutation(
    trpc.termination.approve.mutationOptions({
      onSuccess: (result) => {
        if (result.isFullyApproved) {
          toast.success("Solicitação aprovada! Prestador desativado.");
        } else {
          toast.success(`Etapa aprovada! Próxima etapa: ${result.nextStep}`);
        }
        queryClient.invalidateQueries({ queryKey: trpc.termination.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.termination.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.termination.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.termination.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Solicitação rejeitada");
        queryClient.invalidateQueries({ queryKey: trpc.termination.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.termination.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.termination.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleApprove = async (stepId: string, comment?: string) => {
    await approveMutation.mutateAsync({ stepId, comment });
  };

  const handleReject = async (stepId: string, comment: string) => {
    await rejectMutation.mutateAsync({ stepId, comment });
  };

  if (requestQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!requestQuery.data) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Solicitação não encontrada</p>
        <Link href="/solicitacoes/desligamento">
          <Button variant="link">Voltar para lista</Button>
        </Link>
      </div>
    );
  }

  const request = requestQuery.data;
  const currentStep = canApproveQuery.data?.step;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/solicitacoes/desligamento">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Desligamento
            </h1>
            <ApprovalStatusBadge
              status={request.status}
              currentStep={request.currentStep}
              totalSteps={request.totalSteps}
            />
          </div>
          <p className="text-muted-foreground">
            Solicitação #{request.id.slice(-8).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Dados da Solicitação */}
        <div className="space-y-6 md:col-span-2">
          {/* Alerta de desativação */}
          {request.status === "APPROVED" && !request.provider.isActive && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Prestador Desativado</AlertTitle>
              <AlertDescription>
                Este prestador foi desativado automaticamente após a aprovação
                completa desta solicitação.
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Dados do Prestador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  request.provider.isActive ? "bg-primary/10" : "bg-red-100"
                }`}>
                  <User className={`h-6 w-6 ${
                    request.provider.isActive ? "text-primary" : "text-red-600"
                  }`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-lg">{request.provider.name}</p>
                    <Badge variant={request.provider.isActive ? "default" : "destructive"}>
                      {request.provider.isActive ? "Ativo" : "Desligado"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {request.providerPosition} - {request.providerArea}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motivo do Desligamento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{request.reason}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Informações de Desligamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tipo */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant={request.terminationType === "DISMISSAL" ? "destructive" : "secondary"}>
                  {TERMINATION_TYPE_LABELS[request.terminationType]}
                </Badge>
              </div>

              {/* Data */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Data de Desligamento:</span>
                <span className="font-medium">
                  {format(new Date(request.terminationDate), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>

              <Separator />

              {/* Cálculo */}
              <div className="p-4 bg-amber-50 rounded-xl space-y-3">
                <h4 className="font-semibold text-amber-800">Valor Devido pela Empresa</h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-amber-700">Salário base:</span>
                    <span>{formatCurrency(request.providerSalary)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-amber-700">
                      Proporcional ({request.terminationInfo.daysWorkedInMonth}/{request.terminationInfo.totalDaysInMonth} dias):
                    </span>
                    <span>{formatCurrency(request.terminationInfo.proportionalSalary)}</span>
                  </div>

                  {request.terminationType === "DISMISSAL" && (
                    <div className="flex justify-between">
                      <span className="text-amber-700">Salário adicional (demissão):</span>
                      <span>{formatCurrency(request.terminationInfo.additionalSalary)}</span>
                    </div>
                  )}

                  <Separator className="bg-amber-200" />

                  <div className="flex justify-between text-base font-bold text-amber-900">
                    <span>Total Devido:</span>
                    <span>{formatCurrency(request.terminationInfo.totalDue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informações da Solicitação</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado por:</span>
                <span className="font-medium">{request.creator.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Data de criação:</span>
                <span className="font-medium">
                  {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Última atualização:</span>
                <span className="font-medium">
                  {format(new Date(request.updatedAt), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Timeline e Ações */}
        <div className="space-y-6">
          <ApprovalTimeline
            steps={request.approvalSteps}
            currentStep={request.currentStep}
            potentialApprovers={canApproveQuery.data?.potentialApprovers}
          />

          {/* Ações de Aprovação */}
          {request.status === "PENDING" && currentStep && (
            <Card>
              <CardHeader>
                <CardTitle>Ações</CardTitle>
                <CardDescription>
                  Aprovar ou rejeitar esta solicitação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApprovalActions
                  stepId={currentStep.id}
                  stepRole={currentStep.role}
                  stepNumber={currentStep.stepNumber}
                  canApprove={canApproveQuery.data?.canApprove || false}
                  isAdminOverride={canApproveQuery.data?.isAdminOverride || false}
                  potentialApprovers={canApproveQuery.data?.potentialApprovers}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isLoading={approveMutation.isPending || rejectMutation.isPending}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
