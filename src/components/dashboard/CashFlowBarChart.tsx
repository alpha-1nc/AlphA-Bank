"use client";

import { formatWon } from "@/lib/format-money";

interface MonthlyData {
  month: string;
  income: number;
  expense: number;
  saving: number;
}

type Kind = "income" | "expense" | "saving";

const SERIES: { key: Kind; label: string; color: string }[] = [
  { key: "income", label: "수입", color: "var(--tk-accent)" },
  { key: "expense", label: "예상 지출", color: "var(--tk-negative)" },
  { key: "saving", label: "저축·투자", color: "var(--tk-positive)" },
];

const MIN_PCT = 3;

/** 카드 제목 줄 오른쪽에 두는 범례 */
export function CashFlowLegend() {
  return (
    <div className="t7 flex shrink-0 items-center gap-[10px] whitespace-nowrap text-fg-tertiary">
      {SERIES.map((s) => (
        <span key={s.key} className="flex items-center gap-[6px]">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} aria-hidden />
          {s.label}
        </span>
      ))}
    </div>
  );
}

export default function CashFlowBarChart({ data }: { data: MonthlyData[] }) {
  const max = Math.max(0, ...data.flatMap((d) => SERIES.map((s) => d[s.key])));

  return (
    <div className="flex w-full flex-col" role="img" aria-label="최근 6개월 수입·지출·저축 막대 그래프">
      <div className="flex h-[180px] items-end">
        {data.map((d) => (
          <div key={d.month} className="flex h-full min-w-0 flex-1 items-end justify-center gap-[6px]">
            {SERIES.map((s) => {
              const v = d[s.key];
              if (v <= 0) return null;
              const pct = Math.max(MIN_PCT, (v / max) * 100);
              return (
                <div
                  key={s.key}
                  title={`${d.month} ${s.label} ${formatWon(v)}`}
                  className="w-4 rounded-[5px]"
                  style={{ height: `${pct}%`, background: s.color }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-[10px] flex">
        {data.map((d) => (
          <div key={d.month} className="t7 numeric min-w-0 flex-1 text-center text-fg-tertiary">
            {d.month}
          </div>
        ))}
      </div>
    </div>
  );
}
