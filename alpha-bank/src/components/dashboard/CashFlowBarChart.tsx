"use client";

import { useChartColors } from "@/hooks/useChartColors";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  saving: number;
}

interface Props {
  data: MonthlyData[];
}

function formatYAxis(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return String(value);
}

function formatKRWFull(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) => {
  if (active && payload && payload.length) {
    const labelMap: Record<string, string> = {
      income: "수입",
      expense: "지출",
      saving: "저축",
    };
    return (
      <div className="bg-white border border-slate-100 rounded-xl px-4 py-3 shadow-lg text-sm space-y-1.5">
        <p className="font-black tracking-tighter text-slate-800 mb-2">
          {label}
        </p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-slate-500 font-medium">
              {labelMap[p.name] ?? p.name}
            </span>
            <span className="font-semibold text-slate-800 ml-auto pl-4">
              {formatKRWFull(p.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CashFlowBarChart({ data }: Props) {
  const { income, expense, saving } = useChartColors();
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
        barCategoryGap="28%"
        barGap={3}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#f1f5f9"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
        <Legend
          iconType="circle"
          iconSize={7}
          formatter={(value) => {
            const map: Record<string, string> = {
              income: "수입",
              expense: "지출",
              saving: "저축",
            };
            return (
              <span
                style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}
              >
                {map[value] ?? value}
              </span>
            );
          }}
        />
        <Bar dataKey="income" fill={income} radius={[4, 4, 0, 0]} />
        <Bar dataKey="expense" fill={expense} radius={[4, 4, 0, 0]} />
        <Bar dataKey="saving" fill={saving} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
