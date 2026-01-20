"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Labels para roles de aprovação
const ROLE_LABELS: Record<string, string> = {
  AREA_DIRECTOR: "Diretor da Área",
  HR_DIRECTOR: "Diretor RH",
  CFO: "CFO",
  CEO: "CEO",
};

type ApprovalActionsProps = {
  stepId: string;
  stepRole: string;
  stepNumber: number;
  canApprove: boolean;
  onApprove: (stepId: string, comment?: string) => Promise<void>;
  onReject: (stepId: string, comment: string) => Promise<void>;
  isLoading?: boolean;
};

export function ApprovalActions({
  stepId,
  stepRole,
  stepNumber,
  canApprove,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalActionsProps) {
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(stepId, comment || undefined);
      setShowApproveDialog(false);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim() || comment.trim().length < 3) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(stepId, comment);
      setShowRejectDialog(false);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canApprove) {
    return (
      <div className="text-sm text-muted-foreground p-4 bg-muted rounded-xl text-center">
        Você não tem permissão para aprovar esta etapa.
        <br />
        Aguarde a aprovação de um <strong>{ROLE_LABELS[stepRole] || stepRole}</strong>.
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3">
        <Button
          onClick={() => setShowApproveDialog(true)}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="mr-2 h-4 w-4" />
          Aprovar
        </Button>
        <Button
          onClick={() => setShowRejectDialog(true)}
          disabled={isLoading}
          variant="destructive"
          className="flex-1"
        >
          <XCircle className="mr-2 h-4 w-4" />
          Rejeitar
        </Button>
      </div>

      {/* Dialog de Aprovação */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Aprovação</DialogTitle>
            <DialogDescription>
              Você está aprovando a <strong>Etapa {stepNumber}</strong> (
              {ROLE_LABELS[stepRole] || stepRole}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approve-comment">Comentário (opcional)</Label>
              <Textarea
                id="approve-comment"
                placeholder="Adicione um comentário se necessário..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleApprove}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Rejeição</DialogTitle>
            <DialogDescription>
              Você está rejeitando a <strong>Etapa {stepNumber}</strong> (
              {ROLE_LABELS[stepRole] || stepRole}).
              <br />
              <span className="text-red-500">
                Esta ação encerrará o fluxo de aprovação.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="reject-comment">
                Motivo da rejeição <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="reject-comment"
                placeholder="Informe o motivo da rejeição (mínimo 3 caracteres)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="mt-2"
                required
              />
              {comment.length > 0 && comment.length < 3 && (
                <p className="text-sm text-red-500 mt-1">
                  O motivo deve ter pelo menos 3 caracteres.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !comment.trim() || comment.trim().length < 3}
              variant="destructive"
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="mr-2 h-4 w-4" />
              )}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Componente simplificado para aprovar/rejeitar rapidamente em listagens
type QuickApprovalButtonsProps = {
  stepId: string;
  canApprove: boolean;
  onApprove: (stepId: string) => Promise<void>;
  onReject: (stepId: string, comment: string) => Promise<void>;
  size?: "default" | "sm" | "lg" | "icon";
};

export function QuickApprovalButtons({
  stepId,
  canApprove,
  onApprove,
  onReject,
  size = "sm",
}: QuickApprovalButtonsProps) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(stepId);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!comment.trim() || comment.trim().length < 3) {
      return;
    }
    setIsSubmitting(true);
    try {
      await onReject(stepId, comment);
      setShowRejectDialog(false);
      setComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canApprove) {
    return null;
  }

  return (
    <>
      <div className="flex gap-1">
        <Button
          size={size}
          variant="ghost"
          onClick={handleQuickApprove}
          disabled={isSubmitting}
          className="text-green-600 hover:text-green-700 hover:bg-green-50"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
        </Button>
        <Button
          size={size}
          variant="ghost"
          onClick={() => setShowRejectDialog(true)}
          disabled={isSubmitting}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* Dialog de Rejeição Rápida */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Motivo da Rejeição</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Esta ação encerrará o fluxo de aprovação.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Textarea
              placeholder="Motivo da rejeição (mínimo 3 caracteres)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setComment("");
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSubmitting || !comment.trim() || comment.trim().length < 3}
              variant="destructive"
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
