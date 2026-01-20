"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  Clock,
  XCircle,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Labels para roles de aprovação
const ROLE_LABELS: Record<string, string> = {
  AREA_DIRECTOR: "Diretor da Área",
  HR_DIRECTOR: "Diretor RH",
  CFO: "CFO",
  CEO: "CEO",
};

type ApprovalStep = {
  id: string;
  stepNumber: number;
  role: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverId: string | null;
  approvedAt: string | Date | null;
  comment: string | null;
  approver: {
    id: string;
    name: string;
  } | null;
};

type ApprovalTimelineProps = {
  steps: ApprovalStep[];
  currentStep?: number;
};

export function ApprovalTimeline({ steps, currentStep }: ApprovalTimelineProps) {
  const getStepIcon = (status: string, isCurrentStep: boolean) => {
    if (status === "APPROVED") {
      return <CheckCircle2 className="h-6 w-6 text-green-500" />;
    }
    if (status === "REJECTED") {
      return <XCircle className="h-6 w-6 text-red-500" />;
    }
    if (isCurrentStep) {
      return <Clock className="h-6 w-6 text-yellow-500 animate-pulse" />;
    }
    return <Clock className="h-6 w-6 text-muted-foreground" />;
  };

  const getStepBadge = (status: string) => {
    if (status === "APPROVED") {
      return <Badge className="bg-green-500 text-white">Aprovado</Badge>;
    }
    if (status === "REJECTED") {
      return <Badge variant="destructive">Rejeitado</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  const getLineColor = (status: string, nextStatus: string | null) => {
    if (status === "APPROVED" && nextStatus !== null) {
      return "bg-green-500";
    }
    if (status === "REJECTED") {
      return "bg-red-500";
    }
    return "bg-muted";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Fluxo de Aprovação</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {steps.map((step, index) => {
            const isCurrentStep = step.stepNumber === currentStep;
            const isLastStep = index === steps.length - 1;
            const nextStep = !isLastStep ? steps[index + 1] : null;

            return (
              <div key={step.id} className="relative flex gap-4">
                {/* Linha vertical conectora */}
                {!isLastStep && (
                  <div
                    className={`absolute left-3 top-8 w-0.5 h-[calc(100%-8px)] ${getLineColor(
                      step.status,
                      nextStep?.status || null
                    )}`}
                  />
                )}

                {/* Ícone */}
                <div className="relative z-10 flex-shrink-0">
                  {getStepIcon(step.status, isCurrentStep)}
                </div>

                {/* Conteúdo */}
                <div
                  className={`flex-1 pb-8 ${
                    isCurrentStep ? "bg-muted/50 -mx-2 px-2 py-2 rounded-xl" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        Etapa {step.stepNumber}: {ROLE_LABELS[step.role] || step.role}
                      </span>
                      {getStepBadge(step.status)}
                    </div>
                  </div>

                  {step.status !== "PENDING" && step.approver && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{step.approver.name}</span>
                      </div>
                      {step.approvedAt && (
                        <div className="mt-1">
                          {format(
                            new Date(step.approvedAt),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </div>
                      )}
                      {step.comment && (
                        <div className="mt-2 p-2 bg-muted rounded-lg text-sm">
                          <span className="font-medium">Comentário: </span>
                          {step.comment}
                        </div>
                      )}
                    </div>
                  )}

                  {step.status === "PENDING" && isCurrentStep && (
                    <div className="mt-2 text-sm text-yellow-600">
                      Aguardando aprovação
                    </div>
                  )}

                  {step.status === "PENDING" && !isCurrentStep && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Aguardando etapas anteriores
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de resumo compacto para listagens
type ApprovalStatusBadgeProps = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  currentStep?: number;
  totalSteps?: number;
};

export function ApprovalStatusBadge({
  status,
  currentStep,
  totalSteps,
}: ApprovalStatusBadgeProps) {
  if (status === "APPROVED") {
    return (
      <Badge className="bg-green-500 text-white">
        <CheckCircle2 className="mr-1 h-3 w-3" />
        Aprovado
      </Badge>
    );
  }

  if (status === "REJECTED") {
    return (
      <Badge variant="destructive">
        <XCircle className="mr-1 h-3 w-3" />
        Rejeitado
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock className="mr-1 h-3 w-3" />
      {currentStep && totalSteps
        ? `Etapa ${currentStep}/${totalSteps}`
        : "Pendente"}
    </Badge>
  );
}
