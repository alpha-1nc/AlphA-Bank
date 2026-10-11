"use client";

import { useEffect, useState } from "react";
import { getThemeTokens } from "@/lib/design-tokens";
import { formatWon } from "@/lib/format-money";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
  /** 차트 높이(px 또는 "100%"). 기본 260 */
  height?: number | `${number}%`;
}

function formatYAxis(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return String(value);
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
      <div className="rounded-control bg-card border border-divider px-4 py-3 space-y-1">
        <p className="t7 font-bold text-foreground mb-2">{label}</p>
        {payload.map((p) => (
          <div key={p.name} className="t7 flex items-center gap-2">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
            <span className="text-fg-secondary">{labelMap[p.name] ?? p.name}</span>
            <span className="numeric ml-auto pl-4 font-semibold text-foreground">{formatWon(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function CashFlowBarChart({ data, height = 260 }: Props) {
  const isDark = useIsDarkMode();
  const t = getThemeTokens(isDark);
  // 값 3개가 모두 0인 달은 막대를 그리지 않고 월 라벨만 남김
  const chartData = data.map((d) =>
    d.income === 0 && d.expense === 0 && d.saving === 0
      ? { month: d.month, income: null, expense: null, saving: null }
      : d
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={4}>
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: t.tertiaryFg, fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatYAxis}
          tick={{ fontSize: 12, fill: t.tertiaryFg, fontWeight: 400 }}
          axisLine={false}
          tickLine={false}
          width={44}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: t.divider }} />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => {
            const map: Record<string, string> = {
              income: "수입",
              expense: "지출",
              saving: "저축",
            };
            return (
              <span style={{ fontSize: 12, color: t.tertiaryFg, fontWeight: 500 }}>
                {map[value] ?? value}
              </span>
            );
          }}
        />
        <Bar dataKey="income" fill={t.accent} barSize={22} radius={[5, 5, 0, 0]} />
        <Bar dataKey="expense" fill={t.negative} barSize={22} radius={[5, 5, 0, 0]} />
        <Bar dataKey="saving" fill={t.positive} barSize={22} radius={[5, 5, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
