"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useMotionTransition } from "./tds-motion";

/** TDS ProgressBar API를 따르는 자체 구현. animate면 진행도 변화에 스프링(SPRING.slide). */

export type ProgressBarProps = {
  /** 0.0 ~ 1.0 */
  progress: number;
  size?: "light" | "normal" | "bold";
  /** CSS 색 값. 기본 accent */
  color?: string;
  animate?: boolean;
  className?: string;
};

/** 확정 높이(px) */
const HEIGHT = { light: 4, normal: 6, bold: 10 } as const;

export function ProgressBar({ progress, size = "normal", color = "var(--primary)", animate = false, className }: ProgressBarProps) {
  const slide = useMotionTransition(SPRING.slide);
  const p = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
      className={cn("w-full overflow-hidden rounded-full bg-divider", className)}
      style={{ height: HEIGHT[size] }}
    >
      <motion.div
        className="h-full rounded-full"
        style={{ backgroundColor: color }}
        initial={false}
        animate={{ width: `${p * 100}%` }}
        transition={animate ? slide : { duration: 0 }}
      />
    </div>
  );
}
