"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  CheckCircle,
  DollarSign,
  Loader2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { ApprovalActions } from "@/components/approval-actions";
import { ApprovalStatusBadge, ApprovalTimeline } from "@/components/approval-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const HIRING_TYPE_LABELS = {
  INCREASE: "Aumento de Quadro",
  REPLACEMENT: "Substituição",
};

const HIRING_STATUS_LABELS = {
  WAITING: "Aguardando",
  IN_PROGRESS: "Em Andamento",
  HIRED: "Contratado",
};

const PRIORITY_LABELS = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

export default function HiringDetailPage() {
  const params = useParams();
  const requestId = params.id as string;
  const queryClient = useQueryClient();

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({
    hiringStatus: "" as "WAITING" | "IN_PROGRESS" | "HIRED" | "",
    hiredName: "",
    actualStartDate: "",
  });

  // Queries
  const requestQuery = useQuery(
    trpc.hiring.getById.queryOptions({ id: requestId })
  );

  const canApproveQuery = useQuery(
    trpc.hiring.canApprove.queryOptions({ requestId })
  );

  // Mutations
  const approveMutation = useMutation(
    trpc.hiring.approve.mutationOptions({
      onSuccess: (result) => {
        if (result.isFullyApproved) {
          toast.success("Solicitação aprovada com sucesso!");
        } else {
          toast.success(`Etapa aprovada! Próxima etapa: ${result.nextStep}`);
        }
        queryClient.invalidateQueries({ queryKey: trpc.hiring.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.hiring.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.hiring.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const rejectMutation = useMutation(
    trpc.hiring.reject.mutationOptions({
      onSuccess: () => {
        toast.success("Solicitação rejeitada");
        queryClient.invalidateQueries({ queryKey: trpc.hiring.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.hiring.canApprove.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.hiring.list.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updateStatusMutation = useMutation(
    trpc.hiring.updateHiringStatus.mutationOptions({
      onSuccess: (data) => {
        if (data.hiringStatus === "HIRED") {
          toast.success("Contratação finalizada! Prestador criado.");
        } else {
          toast.success("Status atualizado com sucesso!");
        }
        setShowStatusDialog(false);
        queryClient.invalidateQueries({ queryKey: trpc.hiring.getById.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.hiring.list.queryKey() });
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

  const handleUpdateStatus = () => {
    if (!statusForm.hiringStatus) {
      toast.error("Selecione o status");
      return;
    }

    if (statusForm.hiringStatus === "HIRED") {
      if (!statusForm.hiredName) {
        toast.error("Informe o nome do contratado");
        return;
      }
      if (!statusForm.actualStartDate) {
        toast.error("Informe a data de início");
        return;
      }
    }

    updateStatusMutation.mutate({
      id: requestId,
      hiringStatus: statusForm.hiringStatus,
      hiredName: statusForm.hiredName || undefined,
      actualStartDate: statusForm.actualStartDate || undefined,
    });
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
        <Link href="/solicitacoes/contratacao">
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
        <Link href="/solicitacoes/contratacao">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">
              Contratação
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
              <CardTitle>Dados da Vaga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Briefcase className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cargo</p>
                    <p className="font-semibold">{request.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Área</p>
                    <p className="font-semibold">{request.area}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Salário Proposto</p>
                    <p className="font-semibold">{formatCurrency(request.proposedSalary)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Prevista</p>
                    <p className="font-semibold">
                      {format(new Date(request.expectedStartDate), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant={request.hiringType === "INCREASE" ? "default" : "secondary"}>
                    {HIRING_TYPE_LABELS[request.hiringType]}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Prioridade</p>
                  <Badge
                    variant={
                      request.priority === "HIGH"
                        ? "destructive"
                        : request.priority === "MEDIUM"
                          ? "default"
                          : "secondary"
                    }
                  >
                    {PRIORITY_LABELS[request.priority]}
                  </Badge>
                </div>
              </div>

              {request.replacedProvider && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Substituindo:</p>
                    <p className="font-medium">{request.replacedProvider.name}</p>
                  </div>
                </>
              )}

              {request.reason && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Justificativa:</p>
                    <p className="text-sm">{request.reason}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Status de Contratação */}
          {request.status === "APPROVED" && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Status da Contratação</CardTitle>
                    <CardDescription>
                      Acompanhe o progresso da contratação
                    </CardDescription>
                  </div>
                  {request.hiringStatus !== "HIRED" && (
                    <Button onClick={() => {
                      setStatusForm({
                        hiringStatus: "",
                        hiredName: "",
                        actualStartDate: "",
                      });
                      setShowStatusDialog(true);
                    }}>
                      Atualizar Status
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${
                        request.hiringStatus === "WAITING"
                          ? "bg-yellow-500"
                          : request.hiringStatus === "IN_PROGRESS"
                            ? "bg-blue-500"
                            : "bg-green-500"
                      }`} />
                      <span className="font-medium">
                        {HIRING_STATUS_LABELS[request.hiringStatus]}
                      </span>
                    </div>
                    {request.hiredName && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Contratado:</p>
                        <p className="font-semibold">{request.hiredName}</p>
                        {request.actualStartDate && (
                          <p className="text-sm text-muted-foreground">
                            Início: {format(new Date(request.actualStartDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  {request.hiringStatus === "HIRED" && (
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  )}
                </div>
              </CardContent>
            </Card>
          )}

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

      {/* Dialog para atualizar status */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar Status da Contratação</DialogTitle>
            <DialogDescription>
              Atualize o status do processo de contratação
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusForm.hiringStatus}
                onValueChange={(value) =>
                  value && setStatusForm({ ...statusForm, hiringStatus: value as any })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WAITING">Aguardando</SelectItem>
                  <SelectItem value="IN_PROGRESS">Em Andamento</SelectItem>
                  <SelectItem value="HIRED">Contratado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {statusForm.hiringStatus === "HIRED" && (
              <>
                <div className="space-y-2">
                  <Label>Nome do Contratado *</Label>
                  <Input
                    value={statusForm.hiredName}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, hiredName: e.target.value })
                    }
                    placeholder="Nome completo do contratado"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data de Início *</Label>
                  <Input
                    type="date"
                    value={statusForm.actualStartDate}
                    onChange={(e) =>
                      setStatusForm({ ...statusForm, actualStartDate: e.target.value })
                    }
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdateStatus}
              disabled={updateStatusMutation.isPending}
            >
              {updateStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
