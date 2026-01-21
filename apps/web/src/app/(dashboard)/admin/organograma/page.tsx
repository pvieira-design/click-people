"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Building2,
  Crown,
  Edit,
  Loader2,
  Shield,
  Star,
  User,
  UserCog,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DesignatedPerson = {
  id: string;
  name: string;
  email: string;
  hierarchyLevel: { name: string; level: number } | null;
  position: { name: string } | null;
} | null;

type OrgChartArea = {
  id: string;
  name: string;
  designatedCLevel: DesignatedPerson;
  designatedDirector: DesignatedPerson;
  designatedLeader: DesignatedPerson;
  hasDirector: boolean;
  hasCLevel: boolean;
  hasLeader: boolean;
  cLevelUsers: Array<{ id: string; name: string; level: string; position: string }>;
  directors: Array<{ id: string; name: string; level: string; position: string }>;
  managers: Array<{ id: string; name: string; level: string; position: string }>;
  team: Array<{ id: string; name: string; level: string; position: string }>;
  providers: Array<{ id: string; name: string; seniority: string; position: string }>;
  stats: { totalUsers: number; totalProviders: number };
};

type AreaRole = "cLevel" | "director" | "leader";

const ROLE_CONFIG = {
  cLevel: {
    label: "C-Level",
    description: "Executivo responsavel pela visao estrategica da area",
    icon: Crown,
    color: "purple",
    minLevel: 90,
  },
  director: {
    label: "Diretor",
    description: "Responsavel por aprovar solicitacoes da 1ª etapa",
    icon: Shield,
    color: "blue",
    minLevel: 80,
  },
  leader: {
    label: "Lider",
    description: "Pode abrir solicitacoes em nome da area",
    icon: Star,
    color: "emerald",
    minLevel: 40,
  },
};

function PersonCard({
  name,
  subtitle,
  badge,
  variant = "default",
}: {
  name: string;
  subtitle: string;
  badge?: string;
  variant?: "clevel" | "director" | "manager" | "team" | "provider" | "leader" | "default";
}) {
  const bgColors = {
    clevel: "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800",
    director: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800",
    leader: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800",
    manager: "bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800",
    team: "bg-slate-50 border-slate-200 dark:bg-slate-800/50 dark:border-slate-700",
    provider: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800",
    default: "bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700",
  };

  const iconColors = {
    clevel: "text-purple-600 dark:text-purple-400",
    director: "text-blue-600 dark:text-blue-400",
    leader: "text-emerald-600 dark:text-emerald-400",
    manager: "text-teal-600 dark:text-teal-400",
    team: "text-slate-600 dark:text-slate-400",
    provider: "text-amber-600 dark:text-amber-400",
    default: "text-gray-600 dark:text-gray-400",
  };

  const icons = {
    clevel: Crown,
    director: Shield,
    leader: Star,
    manager: UserCog,
    team: User,
    provider: Users,
    default: User,
  };

  const Icon = icons[variant];

  return (
    <div className={`flex items-center gap-2 rounded-lg border p-2 ${bgColors[variant]}`}>
      <Icon className={`h-4 w-4 shrink-0 ${iconColors[variant]}`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {badge && (
        <Badge variant="secondary" className="shrink-0 text-[10px]">
          {badge}
        </Badge>
      )}
    </div>
  );
}

function RoleButton({
  person,
  role,
  onClick,
}: {
  person: DesignatedPerson;
  role: AreaRole;
  onClick: () => void;
}) {
  const config = ROLE_CONFIG[role];
  const Icon = config.icon;

  if (person) {
    return (
      <button
        onClick={onClick}
        className={`flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-accent bg-${config.color}-50 border-${config.color}-200 dark:bg-${config.color}-900/20 dark:border-${config.color}-800`}
      >
        <Icon className={`h-4 w-4 shrink-0 text-${config.color}-600 dark:text-${config.color}-400`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {config.label}
          </p>
          <p className="truncate text-sm font-medium">{person.name}</p>
        </div>
        <Edit className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-2 rounded-lg border border-dashed border-muted-foreground/30 p-2 text-left transition-colors hover:border-muted-foreground hover:bg-accent"
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {config.label}
        </p>
        <p className="text-xs text-muted-foreground">Nao configurado</p>
      </div>
      <Edit className="h-3 w-3 shrink-0 text-muted-foreground" />
    </button>
  );
}

function AreaColumn({
  area,
  onSetRole,
}: {
  area: OrgChartArea;
  onSetRole: (areaId: string, areaName: string, role: AreaRole, currentUserId: string | null) => void;
}) {
  const totalPeople =
    area.cLevelUsers.length +
    area.directors.length +
    area.managers.length +
    area.team.length +
    area.providers.length;

  return (
    <Card className="h-fit min-w-[300px] max-w-[340px] shrink-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span className="truncate">{area.name}</span>
          </div>
          <Badge variant="outline" className="shrink-0">
            {totalPeople}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Responsaveis Designados */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Responsaveis
          </p>
          <div className="space-y-1.5">
            <RoleButton
              person={area.designatedCLevel}
              role="cLevel"
              onClick={() => onSetRole(area.id, area.name, "cLevel", area.designatedCLevel?.id || null)}
            />
            <RoleButton
              person={area.designatedDirector}
              role="director"
              onClick={() => onSetRole(area.id, area.name, "director", area.designatedDirector?.id || null)}
            />
            <RoleButton
              person={area.designatedLeader}
              role="leader"
              onClick={() => onSetRole(area.id, area.name, "leader", area.designatedLeader?.id || null)}
            />
          </div>
        </div>

        {/* Alerta se nao tem diretor */}
        {!area.hasDirector && (
          <div className="flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-xs text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" />
            <span>Aprovaçoes bloqueadas</span>
          </div>
        )}

        {/* Usuarios da Area por nivel */}
        {area.cLevelUsers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              C-Level na Area ({area.cLevelUsers.length})
            </p>
            <div className="space-y-1">
              {area.cLevelUsers.map((person) => (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  subtitle={person.level}
                  badge={person.position}
                  variant="clevel"
                />
              ))}
            </div>
          </div>
        )}

        {area.directors.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Diretores na Area ({area.directors.length})
            </p>
            <div className="space-y-1">
              {area.directors.map((person) => (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  subtitle={person.level}
                  badge={person.position}
                  variant="director"
                />
              ))}
            </div>
          </div>
        )}

        {area.managers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Gestores ({area.managers.length})
            </p>
            <div className="space-y-1">
              {area.managers.map((person) => (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  subtitle={person.level}
                  badge={person.position}
                  variant="manager"
                />
              ))}
            </div>
          </div>
        )}

        {area.team.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Equipe ({area.team.length})
            </p>
            <div className="space-y-1">
              {area.team.map((person) => (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  subtitle={person.level}
                  badge={person.position}
                  variant="team"
                />
              ))}
            </div>
          </div>
        )}

        {area.providers.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Prestadores ({area.providers.length})
            </p>
            <div className="space-y-1">
              {area.providers.map((person) => (
                <PersonCard
                  key={person.id}
                  name={person.name}
                  subtitle={person.position}
                  badge={person.seniority !== "NA" ? person.seniority : undefined}
                  variant="provider"
                />
              ))}
            </div>
          </div>
        )}

        {totalPeople === 0 && !area.designatedCLevel && !area.designatedDirector && !area.designatedLeader && (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nenhum colaborador nesta area
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function OrganogramaPage() {
  const queryClient = useQueryClient();
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<{
    areaId: string;
    areaName: string;
    role: AreaRole;
    currentUserId: string | null;
  } | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const orgChartQuery = useQuery(trpc.dashboard.getOrgChart.queryOptions());
  const usersQuery = useQuery(trpc.user.list.queryOptions());

  const setRoleMutation = useMutation(
    trpc.area.setAreaRole.mutationOptions({
      onSuccess: () => {
        toast.success("Responsavel atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.dashboard.getOrgChart.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.area.list.queryKey() });
        setIsRoleDialogOpen(false);
        setSelectedRole(null);
        setSelectedUserId(null);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const handleOpenRoleDialog = (
    areaId: string,
    areaName: string,
    role: AreaRole,
    currentUserId: string | null
  ) => {
    setSelectedRole({ areaId, areaName, role, currentUserId });
    setSelectedUserId(currentUserId);
    setIsRoleDialogOpen(true);
  };

  const handleSetRole = () => {
    if (!selectedRole) return;
    setRoleMutation.mutate({
      areaId: selectedRole.areaId,
      role: selectedRole.role,
      userId: selectedUserId,
    });
  };

  // Retornar usuarios ativos para selecao
  // Mostra todos os usuarios ativos - admin pode ver o nivel e decidir
  const getEligibleUsers = () => {
    if (!usersQuery.data) return [];
    return usersQuery.data
      .filter((u) => u.status === "ACTIVE")
      .sort((a, b) => (b.hierarchyLevel?.level || 0) - (a.hierarchyLevel?.level || 0));
  };

  if (orgChartQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const areas = orgChartQuery.data || [];
  const areasWithoutDirector = areas.filter((a) => !a.hasDirector);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Organograma</h1>
        <p className="text-muted-foreground">
          Visualizacao da estrutura organizacional por area
        </p>
      </div>

      {/* Alert for areas without director */}
      {areasWithoutDirector.length > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-400">
              <AlertTriangle className="h-5 w-5" />
              Configuracao Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              As seguintes areas nao possuem diretor configurado e solicitacoes
              nao poderao ser aprovadas:
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {areasWithoutDirector.map((area) => (
                <Badge
                  key={area.id}
                  variant="outline"
                  className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                >
                  {area.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{areas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {areas.reduce((sum, a) => sum + a.stats.totalUsers, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Prestadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {areas.reduce((sum, a) => sum + a.stats.totalProviders, 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Areas sem Diretor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {areasWithoutDirector.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4">
          {areas.map((area) => (
            <AreaColumn
              key={area.id}
              area={area}
              onSetRole={handleOpenRoleDialog}
            />
          ))}
        </div>
      </div>

      {/* Set Role Dialog */}
      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              Configurar {selectedRole && ROLE_CONFIG[selectedRole.role].label}
            </DialogTitle>
            <DialogDescription>
              Selecione o responsavel pela area{" "}
              <span className="font-semibold">{selectedRole?.areaName}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>
                {selectedRole && ROLE_CONFIG[selectedRole.role].label} da Area
              </Label>
              <Select
                value={selectedUserId || "none"}
                onValueChange={(value) =>
                  setSelectedUserId(value === "none" ? null : value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="text-muted-foreground">Nenhum</span>
                  </SelectItem>
                  {getEligibleUsers().map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.hierarchyLevel?.name || user.position?.name || "Sem nivel"}
                          {user.area && ` • ${user.area.name}`}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedRole && ROLE_CONFIG[selectedRole.role].description}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSetRole} disabled={setRoleMutation.isPending}>
              {setRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
