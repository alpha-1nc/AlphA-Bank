import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * TDS Loader API(size / type / label / style / className / id)를 따르는 자체 구현.
 * 문서에 모양 설명이 없어 원형 스피너로 만들었다.
 */

export type LoaderProps = {
  size?: "small" | "medium" | "large";
  /** primary: accent / dark: 어두운 회색 / light: 흰색(어두운 배경용) */
  type?: "primary" | "dark" | "light";
  /** 아래에 표시할 문구. 줄바꿈(\n) 지원 */
  label?: string;
  style?: CSSProperties;
  className?: string;
  id?: string;
};

/** 확정 수치: 지름 / 선 두께 (px) */
const SIZE = {
  small: { d: 24, stroke: 3 },
  medium: { d: 36, stroke: 4 },
  large: { d: 48, stroke: 5 },
} as const;

const COLOR = {
  primary: { arc: "text-primary", track: "text-primary/15", label: "text-fg-secondary" },
  dark: { arc: "text-foreground", track: "text-foreground/10", label: "text-fg-secondary" },
  light: { arc: "text-white", track: "text-white/25", label: "text-white/80" },
} as const;

export function Loader({ size = "medium", type = "primary", label, style, className, id }: LoaderProps) {
  const { d, stroke } = SIZE[size];
  const c = COLOR[type];
  const r = (d - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div id={id} role="status" aria-label={label ?? "불러오는 중"} className={cn("inline-flex flex-col items-center", className)} style={style}>
      <svg width={d} height={d} viewBox={`0 0 ${d} ${d}`} className="animate-spin [animation-duration:0.9s]" aria-hidden>
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className={c.track} />
        <circle
          cx={d / 2}
          cy={d / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circ * 0.28} ${circ}`}
          className={c.arc}
        />
      </svg>
      {label && <p className={cn("t6 mt-3 whitespace-pre-line text-center font-medium", c.label)}>{label}</p>}
    </div>
  );
}
