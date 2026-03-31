"use client";

import { useEffect, useState } from "react";
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

function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const read = () =>
      setIsDark(document.documentElement.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);
  return isDark;
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
      <div className="bg-white dark:bg-[#18181B] border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 shadow-lg dark:shadow-black/40 text-sm space-y-1.5">
        <p className="font-black tracking-tighter text-slate-800 dark:text-slate-100 mb-2">
          {label}
        </p>
        {payload.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ background: p.color }}
            />
            <span className="text-slate-500 dark:text-slate-400 font-medium">
              {labelMap[p.name] ?? p.name}
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-100 ml-auto pl-4">
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
  const isDark = useIsDarkMode();
  const mutedTick = isDark ? "#a1a1aa" : "#94a3b8";
  const gridStroke = isDark ? "rgba(255,255,255,0.08)" : "#f1f5f9";
  const cursorFill = isDark ? "rgba(255,255,255,0.06)" : "#f8fafc";

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
          stroke={gridStroke}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11, fill: mutedTick, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 11, fill: mutedTick, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: cursorFill }} />
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
                style={{ fontSize: 11, color: mutedTick, fontWeight: 600 }}
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
