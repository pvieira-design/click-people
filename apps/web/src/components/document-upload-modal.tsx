"use client";

import { FileText, Loader2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type DocumentType = "nda" | "contract";

interface DocumentUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentType: DocumentType;
  providerId: string;
  providerName: string;
  onUploadSuccess: (url: string) => void;
}

const DOCUMENT_LABELS: Record<DocumentType, string> = {
  nda: "NDA",
  contract: "Contrato",
};

export function DocumentUploadModal({
  open,
  onOpenChange,
  documentType,
  providerId,
  providerName,
  onUploadSuccess,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const documentLabel = DOCUMENT_LABELS[documentType];

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      validateAndSetFile(droppedFile);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      validateAndSetFile(selectedFile);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Apenas arquivos PDF sao aceitos");
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error("Arquivo muito grande. Tamanho maximo: 10MB");
      return;
    }

    setFile(file);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", documentType);
      formData.append("providerId", providerId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao fazer upload");
      }

      const result = await response.json();
      toast.success(`${documentLabel} enviado com sucesso!`);
      onUploadSuccess(result.url);
      handleClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao fazer upload do arquivo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      onOpenChange(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" showCloseButton={!isUploading}>
        <DialogHeader>
          <DialogTitle>Upload do {documentLabel}</DialogTitle>
          <DialogDescription>
            Envie o PDF do {documentLabel} assinado de {providerName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium mb-1">
                Arraste o arquivo PDF aqui
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                ou clique para selecionar
              </p>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => document.getElementById("file-upload")?.click()}
              >
                Selecionar arquivo
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Tamanho maximo: 10MB
              </p>
            </div>
          ) : (
            <div className="border rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 p-2 bg-red-50 rounded-lg">
                  <FileText className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                {!isUploading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setFile(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
