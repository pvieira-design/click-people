"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Award,
  ChevronLeft,
  ChevronRight,
  Download,
  DollarSign,
  Loader2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";

import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TIER_OPTIONS = [
  { value: "NONE", label: "Sem Bônus", percentage: "0%", color: "secondary" },
  { value: "BRONZE", label: "Bronze", percentage: "10%", color: "default" },
  { value: "SILVER", label: "Prata", percentage: "15%", color: "default" },
  { value: "GOLD", label: "Ouro", percentage: "20%", color: "default" },
] as const;

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function BonusPage() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  // Queries
  const bonusListQuery = useQuery(
    trpc.payroll.listBonus.queryOptions({ year, month })
  );

  const totalsQuery = useQuery(
    trpc.payroll.getBonusTotals.queryOptions({ year, month })
  );

  const providersQuery = useQuery(
    trpc.payroll.listProvidersWithBonus.queryOptions({ year, month })
  );

  // Mutations
  const setBonusMutation = useMutation(
    trpc.payroll.setBonus.mutationOptions({
      onSuccess: () => {
        toast.success("Bônus atualizado com sucesso!");
        queryClient.invalidateQueries({ queryKey: trpc.payroll.listBonus.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.payroll.getBonusTotals.queryKey() });
        queryClient.invalidateQueries({ queryKey: trpc.payroll.listProvidersWithBonus.queryKey() });
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePreviousMonth = () => {
    if (month === 1) {
      setMonth(12);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setMonth(1);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleTierChange = (areaId: string, tier: string) => {
    setBonusMutation.mutate({
      areaId,
      year,
      month,
      tier: tier as "NONE" | "BRONZE" | "SILVER" | "GOLD",
    });
  };

  const handleExport = () => {
    // Gerar CSV
    const headers = ["Nome", "Área", "Cargo", "Salário", "Tier", "Bônus", "Remuneração Total"];
    const rows = providersQuery.data?.map((p) => [
      p.name,
      p.area,
      p.position,
      p.salary.toString(),
      p.tier,
      p.bonus.toString(),
      p.totalRemuneration.toString(),
    ]);

    const csvContent = [headers.join(";"), ...(rows?.map((r) => r.join(";")) || [])].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `bonus-prestadores-${year}-${month.toString().padStart(2, "0")}.csv`;
    link.click();

    toast.success("Arquivo exportado com sucesso!");
  };

  const getTierBadge = (tier: string) => {
    const option = TIER_OPTIONS.find((t) => t.value === tier);
    if (!option) return null;

    const colorClass =
      tier === "GOLD"
        ? "bg-yellow-500 text-white"
        : tier === "SILVER"
          ? "bg-gray-400 text-white"
          : tier === "BRONZE"
            ? "bg-amber-600 text-white"
            : "";

    return (
      <Badge variant={option.color as any} className={colorClass}>
        {option.label} ({option.percentage})
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Bônus</h1>
          <p className="text-muted-foreground">
            Defina os tiers de bônus por área e visualize os valores calculados
          </p>
        </div>
        <Button onClick={handleExport} variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Exportar CSV
        </Button>
      </div>

      {/* Month Selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-center min-w-[200px]">
              <h2 className="text-xl font-semibold">
                {MONTHS[month - 1]} {year}
              </h2>
              <p className="text-sm text-muted-foreground">Mês de referência</p>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prestadores</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalsQuery.data?.totalProviders || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Folha Base</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalsQuery.data?.totalSalary || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bônus</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalsQuery.data?.totalBonus || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remuneração Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalsQuery.data?.totalRemuneration || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="areas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="areas">Por Área</TabsTrigger>
          <TabsTrigger value="providers">Por Prestador</TabsTrigger>
        </TabsList>

        <TabsContent value="areas">
          <Card>
            <CardHeader>
              <CardTitle>Bônus por Área</CardTitle>
              <CardDescription>
                Selecione o tier de bônus para cada área no mês de {MONTHS[month - 1]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bonusListQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : bonusListQuery.isError ? (
                <ErrorState
                  message={bonusListQuery.error?.message}
                  onRetry={() => bonusListQuery.refetch()}
                />
              ) : bonusListQuery.data?.length === 0 ? (
                <EmptyState
                  icon={Award}
                  title="Nenhuma area cadastrada"
                  description="Cadastre areas no sistema para gerenciar bonus"
                />
              ) : (
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        <TableHead>Prestadores</TableHead>
                        <TableHead>Folha Base</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Total Bônus</TableHead>
                        <TableHead>Remuneração Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonusListQuery.data?.map((area) => (
                        <TableRow key={area.areaId}>
                          <TableCell className="font-medium">{area.areaName}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{area.providerCount}</Badge>
                          </TableCell>
                          <TableCell>{formatCurrency(area.totalSalary)}</TableCell>
                          <TableCell>
                            <Select
                              value={area.tier}
                              onValueChange={(value) => value && handleTierChange(area.areaId, value)}
                              disabled={setBonusMutation.isPending}
                            >
                              <SelectTrigger className="w-[140px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TIER_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label} ({option.percentage})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(area.totalBonus)}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(area.totalRemuneration)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="providers">
          <Card>
            <CardHeader>
              <CardTitle>Bônus por Prestador</CardTitle>
              <CardDescription>
                Visualize o bônus calculado para cada prestador em {MONTHS[month - 1]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {providersQuery.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : providersQuery.isError ? (
                <ErrorState
                  message={providersQuery.error?.message}
                  onRetry={() => providersQuery.refetch()}
                />
              ) : providersQuery.data?.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="Nenhum prestador encontrado"
                  description="Nao ha prestadores ativos no sistema"
                />
              ) : (
                <div className="rounded-2xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Área</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Salário</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Bônus</TableHead>
                        <TableHead>Remuneração Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providersQuery.data?.map((provider) => (
                        <TableRow key={provider.id}>
                          <TableCell className="font-medium">{provider.name}</TableCell>
                          <TableCell>{provider.area}</TableCell>
                          <TableCell>{provider.position}</TableCell>
                          <TableCell>{formatCurrency(provider.salary)}</TableCell>
                          <TableCell>{getTierBadge(provider.tier)}</TableCell>
                          <TableCell className="text-green-600 font-medium">
                            {formatCurrency(provider.bonus)}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(provider.totalRemuneration)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
