"use client";

import { useEffect, useState } from "react";
import { getThemeTokens } from "@/lib/design-tokens";
import { formatWon } from "@/lib/format-money";
import type { MonthNetDatum } from "@/lib/work-salary-summary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

function formatYAxis(value: number): string {
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(0)}억`;
  if (value >= 10_000) return `${(value / 10_000).toFixed(0)}만`;
  return String(value);
}

/** 다크 모드 여부 (html.dark) — 차트 색을 토큰에서 고르기 위함 */
function useIsDarkMode() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.classList.contains("dark"));
    read();
    const obs = new MutationObserver(read);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return isDark;
}

function formatDurationMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${h}시간 ${String(m).padStart(2, "0")}분`;
}

type ChartRow = MonthNetDatum & { month: string };

const CustomTooltip = ({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
}) => {
  if (active && payload && payload.length) {
    const row = payload[0].payload;
    return (
      <div className="rounded-control bg-card border border-divider px-4 py-3 space-y-2">
        <p className="t7 font-bold text-foreground">
          {row.fullLabel}
        </p>
        <div className="t7 flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0 bg-primary"
            aria-hidden
          />
          <span className="text-fg-secondary">실수령액</span>
          <span className="numeric font-semibold text-foreground ml-auto pl-4">
            {formatWon(row.net)}
          </span>
        </div>
        <p className="t8 text-fg-tertiary">
          총 근무 시간{" "}
          <span className="numeric font-semibold text-foreground">
            {formatDurationMinutes(row.minutes)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

type Props = {
  data: MonthNetDatum[];
};

export default function MonthlySalaryChart({ data }: Props) {
  const t = getThemeTokens(useIsDarkMode());
  const chartData: ChartRow[] = data.map((d) => ({
    ...d,
    month: d.monthLabel,
  }));

  return (
    <section
      className="w-full min-w-0 rounded-card bg-card p-4 md:p-7"
      aria-labelledby="work-chart-heading"
    >
      <h2
        id="work-chart-heading"
        className="t5 font-bold text-foreground mb-6"
      >
        최근 6개월 실수령 추이
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="28%"
          barGap={4}
        >
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: t.tertiaryFg, fontWeight: 400 }}
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: t.divider }}
          />
          <Bar dataKey="net" fill={t.accent} barSize={22} radius={[5, 5, 0, 0]} name="net" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
