import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * TDS Badge API를 따르는 자체 구현.
 * blue → AlphA Bank accent, grey → 무채색(TDS의 elephant 자리, 기본값).
 * teal/green/red/yellow → @toss/tds-colors 값 (--tk-badge-* , design-tokens.ts). 대비 기준으로 단계 선택.
 */

export type BadgeSize = "xsmall" | "small" | "medium" | "large";
export type BadgeVariant = "fill" | "weak";
export type BadgeColor = "blue" | "teal" | "green" | "red" | "yellow" | "grey";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  size?: BadgeSize;
  variant?: BadgeVariant;
  color?: BadgeColor;
};

const SIZE: Record<BadgeSize, string> = {
  xsmall: "h-[18px] px-1.5 text-[11px] leading-none rounded-[6px]",
  small: "h-[22px] px-2 text-[12px] leading-none rounded-[8px]",
  medium: "h-[26px] px-2.5 text-[13px] leading-none rounded-[8px]",
  large: "h-[30px] px-3 text-[14px] leading-none rounded-[10px]",
};

const COLOR: Record<BadgeColor, Record<BadgeVariant, string>> = {
  blue: {
    fill: "bg-primary text-primary-foreground",
    weak: "bg-accent-soft text-primary",
  },
  teal: {
    fill: "bg-[var(--tk-badge-teal-fill)] text-[var(--tk-badge-teal-on)]",
    weak: "bg-[var(--tk-badge-teal-soft)] text-[var(--tk-badge-teal-text)]",
  },
  green: {
    fill: "bg-[var(--tk-badge-green-fill)] text-[var(--tk-badge-green-on)]",
    weak: "bg-[var(--tk-badge-green-soft)] text-[var(--tk-badge-green-text)]",
  },
  red: {
    fill: "bg-[var(--tk-badge-red-fill)] text-[var(--tk-badge-red-on)]",
    weak: "bg-[var(--tk-badge-red-soft)] text-[var(--tk-badge-red-text)]",
  },
  yellow: {
    fill: "bg-[var(--tk-badge-yellow-fill)] text-[var(--tk-badge-yellow-on)]",
    weak: "bg-[var(--tk-badge-yellow-soft)] text-[var(--tk-badge-yellow-text)]",
  },
  grey: {
    fill: "bg-fg-secondary text-card",
    weak: "bg-divider text-fg-secondary",
  },
};

export function Badge({
  size = "small",
  variant = "weak",
  color = "grey",
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      {...rest}
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center whitespace-nowrap font-semibold",
        SIZE[size],
        COLOR[color][variant],
        className
      )}
    />
  );
}
