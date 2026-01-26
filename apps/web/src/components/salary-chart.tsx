"use client";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface SalaryHistoryPoint {
  date: Date | string;
  salary: number;
}

interface SalaryChartProps {
  data: SalaryHistoryPoint[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatCurrencyShort = (value: number) => {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}k`;
  }
  return value.toString();
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-semibold">{formatCurrency(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export function SalaryChart({ data }: SalaryChartProps) {
  // Formatar dados para o gráfico
  const chartData = data.map((point) => ({
    date: format(new Date(point.date), "MMM/yy", { locale: ptBR }),
    salary: point.salary,
    fullDate: format(new Date(point.date), "dd/MM/yyyy", { locale: ptBR }),
  }));

  if (chartData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
        Sem dados de evolução salarial
      </div>
    );
  }

  // Se houver apenas um ponto, mostrar mensagem
  if (chartData.length === 1) {
    return (
      <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm">
        <p>Salário atual: {formatCurrency(chartData[0].salary)}</p>
        <p className="text-xs mt-1">Sem histórico de mudanças salariais</p>
      </div>
    );
  }

  // Calcular limites do eixo Y
  const minSalary = Math.min(...data.map((d) => d.salary));
  const maxSalary = Math.max(...data.map((d) => d.salary));
  const yMin = Math.floor(minSalary * 0.9);
  const yMax = Math.ceil(maxSalary * 1.1);

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tickFormatter={formatCurrencyShort}
            tick={{ fontSize: 10 }}
            className="text-muted-foreground"
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="salary"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{
              fill: "hsl(var(--primary))",
              strokeWidth: 2,
              r: 4,
            }}
            activeDot={{
              r: 6,
              stroke: "hsl(var(--primary))",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
