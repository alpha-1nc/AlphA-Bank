"use client";

import {
  createContext,
  useContext,
  useId,
  useState,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS SegmentedControl API를 따르는 자체 구현.
 * 회색 트랙 위 pill이 layoutId로 미끄러진다 (SPRING.slide). 제어(value)·비제어(defaultValue) 모두 지원.
 */

type Size = "small" | "large";

export type SegmentedControlProps = {
  children: ReactNode;
  size?: Size;
  alignment?: "fixed" | "fluid";
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  className?: string;
  "aria-label"?: string;
};

export type SegmentedControlItemProps = {
  children: ReactNode;
  value: string;
  size?: Size;
  className?: string;
};

type Ctx = {
  selected: string | undefined;
  select: (v: string) => void;
  size: Size;
  alignment: "fixed" | "fluid";
  layoutId: string;
};

const SegmentedContext = createContext<Ctx | null>(null);

/** 확정 수치: small 트랙 36·radius 12·t7 / large 트랙 44·radius 14·t6, 트랙 안쪽 여백 3px */
const TRACK: Record<Size, string> = {
  small: "h-9 rounded-[12px]",
  large: "h-11 rounded-[14px]",
};
const ITEM: Record<Size, string> = {
  small: "t7 rounded-[9px]",
  large: "t6 rounded-[11px]",
};

function Item({ children, value, size, className }: SegmentedControlItemProps) {
  const ctx = useContext(SegmentedContext);
  const slide = useMotionTransition(SPRING.slide);
  if (!ctx) throw new Error("SegmentedControl.Item은 SegmentedControl 안에서 써야 합니다.");
  const selected = ctx.selected === value;
  const s = size ?? ctx.size;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => ctx.select(value)}
      className={cn(
        "relative flex h-full items-center justify-center whitespace-nowrap px-3 transition-colors duration-150",
        ITEM[s],
        ctx.alignment === "fixed" ? "min-w-0 flex-1" : "shrink-0",
        selected ? "font-semibold text-foreground" : "font-medium text-fg-tertiary",
        className
      )}
    >
      {selected && (
        <motion.span
          layoutId={ctx.layoutId}
          transition={slide}
          className={cn("absolute inset-0 bg-card", ITEM[s])}
        />
      )}
      <span className="relative truncate">{children}</span>
    </button>
  );
}

function SegmentedControlRoot({
  children,
  size = "small",
  alignment = "fixed",
  value,
  defaultValue,
  onChange,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps) {
  const [inner, setInner] = useState(defaultValue);
  const selected = value ?? inner;
  const layoutId = `tds-seg-${useId()}`;
  const select = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  return (
    <SegmentedContext.Provider value={{ selected, select, size, alignment, layoutId }}>
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        className={cn(
          "flex w-full bg-divider p-[3px]",
          TRACK[size],
          alignment === "fluid" && "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          className
        )}
      >
        {children}
      </div>
    </SegmentedContext.Provider>
  );
}

export const SegmentedControl = Object.assign(SegmentedControlRoot, { Item });
