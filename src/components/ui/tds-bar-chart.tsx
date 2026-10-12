"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS BarChart API를 따르는 자체 구현.
 * fill: all-bar(전부 같은 색) / single-bar(barIndex만 강조) / auto(오른쪽부터 count개를 blue→green→yellow→orange→red→grey)
 * 강조 막대는 위에서 아래로 옅어지는 그라데이션, 나머지는 단색 회색. 값이 바뀌면 높이에 스프링.
 */

export type BarChartTheme = "blue" | "green" | "yellow" | "orange" | "red" | "grey" | "default";

export type BarChartData = {
  value: number;
  /** 생략하면 data 전체의 최댓값 */
  maxValue?: number;
  label?: string;
  theme?: BarChartTheme;
  /** 막대 위 표시 */
  barAnnotation?: string | number;
};

export type BarChartFill =
  | { type: "all-bar"; theme: BarChartTheme }
  | { type: "single-bar"; theme: BarChartTheme; barIndex: number }
  | { type: "auto"; count: number };

export type BarChartProps = {
  data: BarChartData[];
  fill: BarChartFill;
  /** 전체 높이(px). 기본 205 */
  height?: number;
  className?: string;
};

/** 테마 색: 막대 / annotation 글자 (blue는 accent, 나머지는 TDS adaptive 색) */
const THEME: Record<Exclude<BarChartTheme, "default">, { bar: string; text: string }> = {
  blue: { bar: "var(--primary)", text: "var(--primary)" },
  green: { bar: "var(--adaptiveGreen400)", text: "var(--adaptiveGreen600)" },
  yellow: { bar: "var(--adaptiveYellow400)", text: "var(--adaptiveYellow700)" },
  orange: { bar: "var(--adaptiveOrange400)", text: "var(--adaptiveOrange600)" },
  red: { bar: "var(--adaptiveRed400)", text: "var(--adaptiveRed500)" },
  grey: { bar: "var(--adaptiveGrey400)", text: "var(--adaptiveGrey600)" },
};
const AUTO_ORDER: Exclude<BarChartTheme, "default">[] = ["blue", "green", "yellow", "orange", "red", "grey"];

/** 확정 수치 */
const ANNOTATION_H = 24; // 막대 위 숫자 줄 (t6)
const LABEL_H = 28; // 막대 아래 라벨 줄 (t7, 위 여백 8 포함)
const BAR_MAX_WIDTH = 56; // 막대 최대 폭
const BAR_WIDTH_RATIO = 0.64; // 칸 폭 대비 막대 폭
const BAR_RADIUS = 10;
const MIN_BAR = 6; // 값이 0보다 크면 최소 높이

/** 각 막대의 강조 테마 (null이면 회색) */
function resolveTheme(fill: BarChartFill, d: BarChartData, i: number, n: number): Exclude<BarChartTheme, "default"> | null {
  const pick = (t: BarChartTheme | undefined) => (t && t !== "default" ? t : null);
  if (fill.type === "all-bar") return pick(d.theme ?? fill.theme);
  if (fill.type === "single-bar") return i === fill.barIndex ? pick(d.theme ?? fill.theme) : null;
  const fromRight = n - 1 - i;
  if (fromRight < fill.count) return AUTO_ORDER[fromRight % AUTO_ORDER.length];
  return null;
}

export function BarChart({ data, fill, height = 205, className }: BarChartProps) {
  const spring = useMotionTransition(SPRING.slide);
  const n = data.length;
  const autoMax = Math.max(0, ...data.map((d) => d.value));
  const barArea = Math.max(0, height - ANNOTATION_H - LABEL_H);
  const sparse = n > 12; // 12개 초과면 처음·마지막만 라벨/주석

  return (
    <div className={cn("flex w-full items-end gap-2", className)} style={{ height }} role="img" aria-label="막대 그래프">
      {data.map((d, i) => {
        const max = d.maxValue ?? autoMax;
        const ratio = max > 0 ? Math.min(1, Math.max(0, d.value / max)) : 0;
        const barH = d.value > 0 ? Math.max(MIN_BAR, Math.round(ratio * (barArea - 4))) : 0;
        const theme = resolveTheme(fill, d, i, n);
        const showText = !sparse || i === 0 || i === n - 1;
        const background = theme
          ? `linear-gradient(to bottom, ${THEME[theme].bar}, color-mix(in oklab, ${THEME[theme].bar} 55%, var(--card)))`
          : "var(--divider)";

        return (
          <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full flex-1 flex-col items-center justify-end">
              <div
                className="t6 numeric flex items-end justify-center whitespace-nowrap font-semibold"
                style={{ height: ANNOTATION_H, color: theme ? THEME[theme].text : "var(--fg-tertiary)" }}
              >
                {showText && d.barAnnotation != null ? d.barAnnotation : null}
              </div>
              <motion.div
                className="w-full"
                style={{
                  maxWidth: BAR_MAX_WIDTH,
                  width: `${BAR_WIDTH_RATIO * 100}%`,
                  borderRadius: BAR_RADIUS,
                  background,
                }}
                initial={{ height: 0 }}
                animate={{ height: barH }}
                transition={spring}
              />
            </div>
            <div className="t7 w-full truncate pt-2 text-center text-fg-tertiary" style={{ height: LABEL_H }}>
              {showText ? d.label : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
