"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { ApprovalActions } from "@/components/approval-actions";
import { ApprovalStatusBadge, ApprovalTimeline } from "@/components/approval-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default function RecessDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const queryClient = useQueryClient();

  // Query para detalhes da solicitação
  const requestQuery = useQuery(
    trpc.recess.getById.queryOptions({ id: requestId })
  );

  // Query para verificar se pode aprovar
  const canApproveQuery = useQuery(
    trpc.recess.canApprove.queryOptions({ requestId })
  );

  // Mutations
  const approveMutation = useMutation(
    trpc.recess.approve.mutationOptions({
      onSuccess: (result) => {
        if (result.isFullyApproved) {
          toast.success("Solicitação aprovada com sucesso!");
        } else {
          toast.success(`Etapa aprovada! Próxima etapa: ${result.nextStep}`);
        }
        queryClient.invalidateQueries({ queryKey: trpc.recess.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recess.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recess.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.recess.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Solicitação rejeitada");
        queryClient.invalidateQueries({ queryKey: trpc.recess.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recess.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.recess.list.queryKey() });
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
        <Link href="/solicitacoes/recesso">
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
        <Link href="/solicitacoes/recesso">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Recesso / Férias
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
          <Card>
            <CardHeader>
              <CardTitle>Dados do Prestador</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{request.provider.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.providerPosition} - {request.providerArea}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Período do Recesso</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8 py-4">
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {format(new Date(request.startDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">Data Início</p>
                </div>
                <div className="text-4xl text-muted-foreground">→</div>
                <div className="text-center">
                  <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-2xl font-bold">
                    {format(new Date(request.endDate), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </p>
                  <p className="text-sm text-muted-foreground">Data Fim</p>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="text-center">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {request.daysCount} dias de recesso
                </Badge>
              </div>

              {request.reason && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Motivo:</p>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                </>
              )}
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
