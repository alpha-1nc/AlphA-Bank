"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useAllowMotion, useMotionTransition } from "./tds-motion";

/**
 * TDS Rating API를 따르는 자체 구현.
 * readOnly=true: 표시 전용 (size 전체, variant iconOnly / full / compact)
 * readOnly=false: 별을 눌러 입력 (size는 medium / large / big만, variant 없음)
 * 아래 수치(별 크기, 간격, 숫자 타이포, 색)는 토스 문서에 값이 없어 추정한 것이다.
 */

export type RatingReadOnlySize = "tiny" | "small" | "medium" | "large" | "big";
export type RatingEditableSize = "medium" | "large" | "big";
export type RatingVariant = "full" | "compact" | "iconOnly";

type RatingBaseProps = {
  value: number;
  /** 기본 5 */
  max?: number;
  className?: string;
};

export type RatingProps =
  | (RatingBaseProps & {
      readOnly: true;
      size: RatingReadOnlySize;
      variant: RatingVariant;
      onValueChange?: never;
      disabled?: never;
    })
  | (RatingBaseProps & {
      readOnly: false;
      size: RatingEditableSize;
      variant?: never;
      onValueChange?: (value: number) => void;
      /** 기본 false */
      disabled?: boolean;
    });

/** 추정값 */
const STAR_PX: Record<RatingReadOnlySize, number> = { tiny: 12, small: 14, medium: 16, large: 20, big: 24 };
const VALUE_TEXT: Record<RatingReadOnlySize, string> = {
  tiny: "st13",
  small: "st12",
  medium: "t7",
  large: "st11",
  big: "t6",
};
const FILLED = "#FFB331";
const EMPTY = "var(--tk-divider)";
const STAR_PATH = "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z";

function gapOf(px: number) {
  return Math.max(2, Math.round(px / 8));
}

/** fraction(0~1)만큼 가로로 채운 별 하나 */
function Star({ px, fraction }: { px: number; fraction: number }) {
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <span aria-hidden className="relative inline-block shrink-0" style={{ width: px, height: px }}>
      <svg width={px} height={px} viewBox="0 0 24 24" className="absolute inset-0">
        <path d={STAR_PATH} fill={EMPTY} />
      </svg>
      {f > 0 && (
        <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${f * 100}%` }}>
          <svg width={px} height={px} viewBox="0 0 24 24" className="max-w-none">
            <path d={STAR_PATH} fill={FILLED} />
          </svg>
        </span>
      )}
    </span>
  );
}

function formatValue(v: number) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
}

function EditableStar({
  index,
  px,
  fraction,
  disabled,
  onHover,
  onPick,
}: {
  index: number;
  px: number;
  fraction: number;
  disabled: boolean;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const allowMotion = useAllowMotion();
  const press = useMotionTransition(SPRING.press);
  return (
    <motion.button
      type="button"
      tabIndex={-1}
      aria-hidden
      disabled={disabled}
      onMouseEnter={() => onHover(index)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onPick(index + 1)}
      whileTap={allowMotion && !disabled ? { scale: 0.9 } : undefined}
      transition={press}
      className="inline-flex shrink-0 cursor-pointer disabled:cursor-default"
    >
      <Star px={px} fraction={fraction} />
    </motion.button>
  );
}

export function Rating(props: RatingProps) {
  const { value, max = 5, className, readOnly, size } = props;
  const [hover, setHover] = useState<number | null>(null);
  const px = STAR_PX[size];
  const gap = gapOf(px);
  const clamped = Math.min(max, Math.max(0, Number.isFinite(value) ? value : 0));
  const shown = !readOnly && hover != null ? hover + 1 : clamped;
  const disabled = !readOnly && !!props.disabled;
  const variant = readOnly ? props.variant : "iconOnly";

  const range = (
    <input
      type="range"
      min={0}
      max={max}
      step={readOnly ? "any" : 1}
      value={clamped}
      readOnly={readOnly}
      disabled={disabled}
      tabIndex={readOnly ? -1 : 0}
      aria-valuetext={`${max}점 만점 중 ${formatValue(clamped)}점`}
      onChange={(e) => {
        if (!readOnly) props.onValueChange?.(Number(e.target.value));
      }}
      className="sr-only"
    />
  );

  const valueText = (
    <span className={cn(VALUE_TEXT[size], "numeric font-semibold text-fg-secondary")} aria-hidden>
      {formatValue(clamped)}
    </span>
  );

  if (variant === "compact") {
    return (
      <span className={cn("relative inline-flex items-center", className)} style={{ gap }}>
        {range}
        <Star px={px} fraction={1} />
        {valueText}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex items-center rounded-sm has-[input:focus-visible]:outline has-[input:focus-visible]:outline-2 has-[input:focus-visible]:outline-primary",
        disabled && "opacity-40",
        className
      )}
      style={{ gap: variant === "full" ? gap * 2 : 0 }}
    >
      {range}
      <span className="inline-flex items-center" style={{ gap }}>
        {Array.from({ length: max }).map((_, i) =>
          readOnly ? (
            <Star key={i} px={px} fraction={shown - i} />
          ) : (
            <EditableStar
              key={i}
              index={i}
              px={px}
              fraction={shown - i}
              disabled={disabled}
              onHover={setHover}
              onPick={(v) => props.onValueChange?.(v)}
            />
          )
        )}
      </span>
      {variant === "full" && valueText}
    </span>
  );
}
