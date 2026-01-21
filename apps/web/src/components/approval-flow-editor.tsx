"use client";

import { useCallback, useState } from "react";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  GripVertical,
  Lock,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type RequestType = "RECESS" | "TERMINATION" | "HIRING" | "PURCHASE" | "REMUNERATION";

interface FlowConfig {
  enabled: boolean;
  steps: string[];
}

interface ApprovalFlowsConfig {
  version: number;
  lastUpdatedAt: string;
  lastUpdatedBy: string;
  flows: Record<RequestType, FlowConfig>;
}

const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  RECESS: "Recesso/Férias",
  TERMINATION: "Desligamento",
  HIRING: "Contratação",
  PURCHASE: "Compra",
  REMUNERATION: "Remuneração",
};

const REQUEST_TYPES: RequestType[] = [
  "RECESS",
  "TERMINATION",
  "HIRING",
  "PURCHASE",
  "REMUNERATION",
];

interface SortableStepProps {
  id: string;
  step: string;
  stepNumber: number;
  isFirst: boolean;
  onRemove: () => void;
  getAreaLabel: (step: string) => string;
}

function SortableStep({
  id,
  step,
  stepNumber,
  isFirst,
  onRemove,
  getAreaLabel,
}: SortableStepProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: isFirst });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="mb-2">
      <div
        className={`flex items-center gap-2 rounded-xl border p-3 ${
          isFirst
            ? "border-primary/30 bg-primary/5"
            : "border-border bg-background hover:border-primary/50"
        }`}
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-medium">
          {stepNumber}
        </div>

        {isFirst ? (
          <Lock className="h-4 w-4 text-muted-foreground" />
        ) : (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
        )}

        <span className="flex-1 text-sm">
          {getAreaLabel(step)}
        </span>

        {!isFirst && (
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onRemove}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {stepNumber < 10 && (
        <div className="flex justify-center py-1">
          <ArrowDown className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

interface FlowEditorProps {
  requestType: RequestType;
  flow: FlowConfig;
  availableAreas: Array<{ id: string; name: string; description: string }>;
  onFlowChange: (steps: string[]) => void;
}

function FlowEditor({
  requestType,
  flow,
  availableAreas,
  onFlowChange,
}: FlowEditorProps) {
  const [selectedArea, setSelectedArea] = useState<string>("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const getAreaLabel = useCallback(
    (step: string) => {
      if (step === "REQUEST_AREA") return "Área da Solicitação";
      const area = availableAreas.find((a) => a.id === step);
      return area?.name || step;
    },
    [availableAreas]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = flow.steps.findIndex((s) => s === active.id);
        const newIndex = flow.steps.findIndex((s) => s === over.id);

        // Prevent moving items before the first fixed step
        if (newIndex === 0) return;

        const newSteps = arrayMove(flow.steps, oldIndex, newIndex);
        onFlowChange(newSteps);
      }
    },
    [flow.steps, onFlowChange]
  );

  const handleAddStep = useCallback(() => {
    if (!selectedArea) return;

    // Prevent duplicate consecutive steps
    const lastStep = flow.steps[flow.steps.length - 1];
    if (lastStep === selectedArea) {
      toast.error("Não é possível adicionar etapas duplicadas consecutivas");
      return;
    }

    onFlowChange([...flow.steps, selectedArea]);
    setSelectedArea("");
  }, [selectedArea, flow.steps, onFlowChange]);

  const handleRemoveStep = useCallback(
    (index: number) => {
      if (index === 0) return; // Cannot remove first step
      if (flow.steps.length <= 2) {
        toast.error("O fluxo deve ter no mínimo 2 etapas");
        return;
      }

      const newSteps = flow.steps.filter((_, i) => i !== index);
      onFlowChange(newSteps);
    },
    [flow.steps, onFlowChange]
  );

  // Filter out areas that are already the last step (to prevent consecutive duplicates)
  const filteredAreas = availableAreas.filter(
    (area) =>
      area.id !== "REQUEST_AREA" && // Can't add REQUEST_AREA manually
      area.id !== flow.steps[flow.steps.length - 1] // Prevent consecutive duplicates
  );

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={flow.steps}
          strategy={verticalListSortingStrategy}
        >
          <div className="min-h-[200px]">
            {flow.steps.map((step, index) => (
              <SortableStep
                key={step}
                id={step}
                step={step}
                stepNumber={index + 1}
                isFirst={index === 0}
                onRemove={() => handleRemoveStep(index)}
                getAreaLabel={getAreaLabel}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex gap-2 pt-2 border-t">
        <Select value={selectedArea} onValueChange={(v) => setSelectedArea(v || "")}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Selecione uma área para adicionar..." />
          </SelectTrigger>
          <SelectContent>
            {filteredAreas.map((area) => (
              <SelectItem key={area.id} value={area.id}>
                <div>
                  <span>{area.name}</span>
                  {area.description && (
                    <span className="text-muted-foreground text-xs ml-2">
                      ({area.description})
                    </span>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="default"
          onClick={handleAddStep}
          disabled={!selectedArea}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}

export function ApprovalFlowEditor() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RequestType>("RECESS");
  const [localFlows, setLocalFlows] = useState<Record<RequestType, FlowConfig> | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const flowsQuery = useQuery(trpc.systemConfig.getApprovalFlows.queryOptions());
  const areasQuery = useQuery(trpc.systemConfig.getConfigurableAreas.queryOptions());

  const updateMutation = useMutation(
    trpc.systemConfig.updateApprovalFlows.mutationOptions({
      onSuccess: () => {
        toast.success("Fluxos de aprovação atualizados com sucesso");
        setHasChanges(false);
        queryClient.invalidateQueries({ queryKey: trpc.systemConfig.getApprovalFlows.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao atualizar fluxos");
      },
    })
  );

  const resetMutation = useMutation(
    trpc.systemConfig.resetApprovalFlows.mutationOptions({
      onSuccess: () => {
        toast.success("Fluxos restaurados para os valores padrão");
        setLocalFlows(null);
        setHasChanges(false);
        queryClient.invalidateQueries({ queryKey: trpc.systemConfig.getApprovalFlows.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message || "Erro ao restaurar fluxos");
      },
    })
  );

  // Initialize local flows from query data
  const flows = localFlows || flowsQuery.data?.flows;

  const handleFlowChange = useCallback(
    (requestType: RequestType, steps: string[]) => {
      const currentFlows = localFlows || flowsQuery.data?.flows;
      if (!currentFlows) return;

      const newFlows = {
        ...currentFlows,
        [requestType]: {
          ...currentFlows[requestType],
          steps,
        },
      };

      setLocalFlows(newFlows);
      setHasChanges(true);
    },
    [localFlows, flowsQuery.data?.flows]
  );

  const handleSave = useCallback(() => {
    if (!localFlows) return;
    updateMutation.mutate({ flows: localFlows });
  }, [localFlows, updateMutation]);

  const handleReset = useCallback(() => {
    resetMutation.mutate();
  }, [resetMutation]);

  const handleDiscard = useCallback(() => {
    setLocalFlows(null);
    setHasChanges(false);
  }, []);

  if (flowsQuery.isLoading || areasQuery.isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (flowsQuery.isError || areasQuery.isError) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-destructive text-center">
            Erro ao carregar configurações
          </p>
        </CardContent>
      </Card>
    );
  }

  const availableAreas = areasQuery.data || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fluxos de Aprovação</CardTitle>
        <CardDescription>
          Configure as etapas de aprovação para cada tipo de solicitação.
          A primeira etapa (Área da Solicitação) é fixa e não pode ser alterada.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RequestType)}>
          <TabsList className="w-full">
            {REQUEST_TYPES.map((type) => (
              <TabsTrigger key={type} value={type} className="flex-1">
                {REQUEST_TYPE_LABELS[type]}
              </TabsTrigger>
            ))}
          </TabsList>

          {REQUEST_TYPES.map((type) => (
            <TabsContent key={type} value={type}>
              {flows && flows[type] && (
                <FlowEditor
                  requestType={type}
                  flow={flows[type]}
                  availableAreas={availableAreas}
                  onFlowChange={(steps) => handleFlowChange(type, steps)}
                />
              )}
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1" />
            )}
            Restaurar Padrões
          </Button>

          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="ghost" onClick={handleDiscard}>
                Descartar
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              Salvar Alterações
            </Button>
          </div>
        </div>

        {flowsQuery.data?.lastUpdatedAt && (
          <p className="text-xs text-muted-foreground text-right">
            Última atualização:{" "}
            {new Date(flowsQuery.data.lastUpdatedAt).toLocaleString("pt-BR")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
