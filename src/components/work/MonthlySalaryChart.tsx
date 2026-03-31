"use client";

import { useChartColors } from "@/hooks/useChartColors";
import type { MonthNetDatum } from "@/lib/work-salary-summary";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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
      <div className="bg-white dark:bg-[#18181B] border border-slate-100 dark:border-white/10 rounded-xl px-4 py-3 shadow-lg text-sm space-y-2">
        <p className="font-black tracking-tighter text-slate-800 dark:text-slate-100">
          {row.fullLabel}
        </p>
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full shrink-0 bg-primary"
            aria-hidden
          />
          <span className="text-slate-500 dark:text-slate-400 font-medium">실수령액</span>
          <span className="font-semibold text-slate-800 dark:text-slate-100 ml-auto pl-4 tabular-nums">
            {formatKRWFull(row.net)}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          총 근무 시간{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
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
  const { income } = useChartColors();
  const chartData: ChartRow[] = data.map((d) => ({
    ...d,
    month: d.monthLabel,
  }));

  return (
    <section
      className="rounded-3xl border border-slate-100 dark:border-white/10 bg-white dark:bg-[#18181B] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl"
      aria-labelledby="work-chart-heading"
    >
      <h2
        id="work-chart-heading"
        className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6"
      >
        최근 6개월 실수령 추이
      </h2>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          barCategoryGap="28%"
          barGap={3}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--border)"
            strokeOpacity={0.55}
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
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(148, 163, 184, 0.14)" }}
          />
          <Bar dataKey="net" fill={income} radius={[4, 4, 0, 0]} name="net" />
        </BarChart>
      </ResponsiveContainer>
    </section>
  );
}
