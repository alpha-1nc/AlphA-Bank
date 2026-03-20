"use client";

import { useChartColors } from "@/hooks/useChartColors";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface AssetSlice {
  name: string;
  value: number;
}

interface Props {
  data: AssetSlice[];
  totalNetWorth: number;
}

const FALLBACK_COLORS = [
  "#3b82f6", "#60a5fa", "#93c5fd", "#6366f1", "#a5b4fc", "#94a3b8", "#cbd5e1",
];

function formatKRW(amount: number): string {
  if (amount >= 100_000_000) {
    return `${(amount / 100_000_000).toFixed(1)}억`;
  }
  if (amount >= 10_000) {
    return `${(amount / 10_000).toFixed(0)}만`;
  }
  return new Intl.NumberFormat("ko-KR").format(amount);
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
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-slate-100 rounded-xl px-3 py-2 shadow-lg text-sm">
        <p className="font-semibold text-slate-800">{payload[0].name}</p>
        <p className="text-slate-500">{formatKRWFull(payload[0].value)}</p>
      </div>
    );
  }
  return null;
};

export default function AssetDonutChart({ data, totalNetWorth }: Props) {
  const { bar: donutColors } = useChartColors();
  const colors = donutColors.length >= 7 ? donutColors : FALLBACK_COLORS;
  return (
    <div className="relative w-full h-[260px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={72}
            outerRadius={108}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-xs font-medium text-slate-400 tracking-tight">
          총 자산
        </span>
        <span className="text-xl font-black tracking-tighter text-slate-300 leading-tight">
          {formatKRW(totalNetWorth)}
        </span>
      </div>
    </div>
  );
}
