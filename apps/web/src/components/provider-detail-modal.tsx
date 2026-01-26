"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, differenceInYears, differenceInMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Building2,
  Calendar,
  Camera,
  FileText,
  Loader2,
  MapPin,
  Pencil,
  Save,
  User,
  X,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SalaryChart } from "./salary-chart";

interface ProviderDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string;
  canEdit?: boolean;
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

const formatTenure = (startDate: Date | string) => {
  const start = new Date(startDate);
  const now = new Date();
  const years = differenceInYears(now, start);
  const months = differenceInMonths(now, start) % 12;

  if (years === 0) {
    return `${months} ${months === 1 ? "mês" : "meses"}`;
  }
  if (months === 0) {
    return `${years} ${years === 1 ? "ano" : "anos"}`;
  }
  return `${years} ${years === 1 ? "ano" : "anos"} e ${months} ${months === 1 ? "mês" : "meses"}`;
};

export function ProviderDetailModal({
  open,
  onOpenChange,
  providerId,
  canEdit = false,
}: ProviderDetailModalProps) {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    birthDate: "",
    achievements: "",
    addressStreet: "",
    addressNumber: "",
    addressComplement: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    addressZipCode: "",
  });

  // Queries
  const detailsQuery = useQuery({
    ...trpc.provider.getFullDetails.queryOptions({ id: providerId }),
    enabled: open,
  });

  const salaryHistoryQuery = useQuery({
    ...trpc.provider.getSalaryHistory.queryOptions({ id: providerId }),
    enabled: open,
  });

  // Mutations
  const updatePhotoMutation = useMutation(
    trpc.provider.updatePhoto.mutationOptions({
      onSuccess: () => {
        toast.success("Foto atualizada com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.getFullDetails.queryKey({ id: providerId }) });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const updatePersonalInfoMutation = useMutation(
    trpc.provider.updatePersonalInfo.mutationOptions({
      onSuccess: () => {
        toast.success("Dados atualizados com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.provider.getFullDetails.queryKey({ id: providerId }) });
        setIsEditing(false);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  // Photo upload handler
  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        toast.error("Tipo de arquivo não permitido. Use JPEG, PNG ou WebP.");
        return;
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Imagem muito grande. Tamanho máximo: 2MB");
        return;
      }

      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("providerId", providerId);
        formData.append("type", "photo");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erro ao fazer upload");
        }

        const result = await response.json();
        updatePhotoMutation.mutate({ id: providerId, photoUrl: result.url });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Erro ao fazer upload da foto");
      } finally {
        setIsUploading(false);
      }
    },
    [providerId, updatePhotoMutation]
  );

  // Start editing
  const startEditing = () => {
    if (detailsQuery.data) {
      setEditForm({
        birthDate: detailsQuery.data.birthDate
          ? format(new Date(detailsQuery.data.birthDate), "yyyy-MM-dd")
          : "",
        achievements: detailsQuery.data.achievements || "",
        addressStreet: detailsQuery.data.addressStreet || "",
        addressNumber: detailsQuery.data.addressNumber || "",
        addressComplement: detailsQuery.data.addressComplement || "",
        addressNeighborhood: detailsQuery.data.addressNeighborhood || "",
        addressCity: detailsQuery.data.addressCity || "",
        addressState: detailsQuery.data.addressState || "",
        addressZipCode: detailsQuery.data.addressZipCode || "",
      });
      setIsEditing(true);
    }
  };

  // Save edit
  const saveEdit = () => {
    updatePersonalInfoMutation.mutate({
      id: providerId,
      birthDate: editForm.birthDate || null,
      achievements: editForm.achievements || null,
      addressStreet: editForm.addressStreet || null,
      addressNumber: editForm.addressNumber || null,
      addressComplement: editForm.addressComplement || null,
      addressNeighborhood: editForm.addressNeighborhood || null,
      addressCity: editForm.addressCity || null,
      addressState: editForm.addressState || null,
      addressZipCode: editForm.addressZipCode || null,
    });
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
    setEditForm({
      birthDate: "",
      achievements: "",
      addressStreet: "",
      addressNumber: "",
      addressComplement: "",
      addressNeighborhood: "",
      addressCity: "",
      addressState: "",
      addressZipCode: "",
    });
  };

  const provider = detailsQuery.data;
  const salaryHistory = salaryHistoryQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Detalhes do Prestador</span>
            {canEdit && !isEditing && (
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </Button>
            )}
            {isEditing && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={cancelEditing}
                  disabled={updatePersonalInfoMutation.isPending}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={saveEdit}
                  disabled={updatePersonalInfoMutation.isPending}
                >
                  {updatePersonalInfoMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {detailsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : detailsQuery.isError ? (
          <div className="text-center py-12">
            <p className="text-destructive">Erro ao carregar dados do prestador</p>
            <Button variant="outline" className="mt-4" onClick={() => detailsQuery.refetch()}>
              Tentar novamente
            </Button>
          </div>
        ) : provider ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
            {/* Coluna 1: Foto e Dados Básicos */}
            <div className="space-y-4">
              {/* Foto */}
              <div className="relative group">
                <div className="aspect-[3/4] w-full max-w-48 mx-auto bg-muted rounded-xl overflow-hidden">
                  {provider.photoUrl ? (
                    <img
                      src={provider.photoUrl}
                      alt={provider.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-16 w-16 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {canEdit && (
                  <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl max-w-48 mx-auto">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading ? (
                      <Loader2 className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
                  </label>
                )}
              </div>

              {/* Dados Básicos */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">{provider.name}</h3>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.area.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{provider.position.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Desde {format(new Date(provider.startDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Tempo de casa: {formatTenure(provider.startDate)}
                  </div>
                </div>

                {/* Data de Nascimento */}
                {isEditing ? (
                  <div className="space-y-1">
                    <Label className="text-xs">Data de Nascimento</Label>
                    <Input
                      type="date"
                      value={editForm.birthDate}
                      onChange={(e) =>
                        setEditForm({ ...editForm, birthDate: e.target.value })
                      }
                      className="h-8"
                    />
                  </div>
                ) : provider.birthDate ? (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Nasc: {format(new Date(provider.birthDate), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                ) : null}

                {/* Salário */}
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Salário atual</p>
                  <p className="text-xl font-bold">{formatCurrency(provider.salary)}</p>
                </div>

                {/* Status */}
                <Badge variant={provider.isActive ? "default" : "destructive"}>
                  {provider.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </div>

            {/* Coluna 2: Endereço e Documentos */}
            <div className="space-y-4">
              {/* Endereço */}
              <div className="border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </h4>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Rua/Logradouro</Label>
                      <Input
                        value={editForm.addressStreet}
                        onChange={(e) =>
                          setEditForm({ ...editForm, addressStreet: e.target.value })
                        }
                        placeholder="Rua, Avenida..."
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Número</Label>
                        <Input
                          value={editForm.addressNumber}
                          onChange={(e) =>
                            setEditForm({ ...editForm, addressNumber: e.target.value })
                          }
                          placeholder="123"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Complemento</Label>
                        <Input
                          value={editForm.addressComplement}
                          onChange={(e) =>
                            setEditForm({ ...editForm, addressComplement: e.target.value })
                          }
                          placeholder="Apto 101"
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Bairro</Label>
                      <Input
                        value={editForm.addressNeighborhood}
                        onChange={(e) =>
                          setEditForm({ ...editForm, addressNeighborhood: e.target.value })
                        }
                        placeholder="Centro"
                        className="h-8"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Cidade</Label>
                        <Input
                          value={editForm.addressCity}
                          onChange={(e) =>
                            setEditForm({ ...editForm, addressCity: e.target.value })
                          }
                          placeholder="São Paulo"
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Estado</Label>
                        <Input
                          value={editForm.addressState}
                          onChange={(e) =>
                            setEditForm({ ...editForm, addressState: e.target.value })
                          }
                          placeholder="SP"
                          maxLength={2}
                          className="h-8"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CEP</Label>
                      <Input
                        value={editForm.addressZipCode}
                        onChange={(e) =>
                          setEditForm({ ...editForm, addressZipCode: e.target.value })
                        }
                        placeholder="00000-000"
                        className="h-8"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    {provider.addressStreet ? (
                      <>
                        <p>
                          {provider.addressStreet}
                          {provider.addressNumber && `, ${provider.addressNumber}`}
                          {provider.addressComplement && ` - ${provider.addressComplement}`}
                        </p>
                        {provider.addressNeighborhood && <p>{provider.addressNeighborhood}</p>}
                        <p>
                          {provider.addressCity && provider.addressCity}
                          {provider.addressState && ` - ${provider.addressState}`}
                        </p>
                        {provider.addressZipCode && (
                          <p className="text-muted-foreground">{provider.addressZipCode}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-muted-foreground italic">Endereço não cadastrado</p>
                    )}
                  </div>
                )}
              </div>

              {/* Documentos */}
              <div className="border rounded-xl p-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documentos
                </h4>

                <div className="space-y-3">
                  {/* NDA */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">NDA</span>
                    <div className="flex items-center gap-2">
                      <Badge variant={provider.ndaStatus === "SIGNED" ? "default" : "secondary"}>
                        {provider.ndaStatus === "SIGNED" ? "Assinado" : "Pendente"}
                      </Badge>
                      {provider.ndaFileUrl && (
                        <a
                          href={provider.ndaFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Contrato */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Contrato</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={provider.contractStatus === "SIGNED" ? "default" : "secondary"}
                      >
                        {provider.contractStatus === "SIGNED" ? "Assinado" : "Pendente"}
                      </Badge>
                      {provider.contractFileUrl && (
                        <a
                          href={provider.contractFileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <FileText className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna 3: Gráfico e Feitos */}
            <div className="space-y-4">
              {/* Gráfico de Evolução Salarial */}
              <div className="border rounded-xl p-4">
                <h4 className="font-medium mb-3">Evolução Salarial</h4>
                {salaryHistoryQuery.isLoading ? (
                  <div className="h-48 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : salaryHistory ? (
                  <SalaryChart data={salaryHistory} />
                ) : null}
              </div>

              {/* Feitos Relevantes */}
              <div className="border rounded-xl p-4">
                <h4 className="font-medium mb-3">Feitos Relevantes</h4>
                {isEditing ? (
                  <Textarea
                    value={editForm.achievements}
                    onChange={(e) =>
                      setEditForm({ ...editForm, achievements: e.target.value })
                    }
                    placeholder="Descreva os principais feitos e conquistas do prestador..."
                    rows={6}
                  />
                ) : provider.achievements ? (
                  <p className="text-sm whitespace-pre-wrap">{provider.achievements}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    Nenhum feito cadastrado
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
