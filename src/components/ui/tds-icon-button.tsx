"use client";

import type { ButtonHTMLAttributes, CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useAllowMotion } from "./tds-motion";

/**
 * TDS IconButton API를 따르는 자체 구현. 토스의 src/name(CDN 아이콘) 대신 lucide 컴포넌트를 icon으로 받는다.
 * fill: bgColor가 기본 배경 / clear·border: 누를 때만 bgColor 배경. 누르면 0.9 스프링.
 */

export type IconButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "color" | "children"
> & {
  "aria-label": string;
  icon: LucideIcon;
  variant?: "fill" | "clear" | "border";
  /** 아이콘 색 (CSS 색 값). 기본 fg-secondary */
  color?: string;
  /** 배경색 (CSS 색 값). 기본 divider */
  bgColor?: string;
  /** 아이콘 크기(px). 기본 24 — 버튼은 아이콘 + 상하좌우 8px */
  iconSize?: number;
};

export function IconButton({
  icon: Icon,
  variant = "clear",
  color,
  bgColor = "var(--divider)",
  iconSize = 24,
  disabled,
  className,
  style,
  ...rest
}: IconButtonProps) {
  const allowMotion = useAllowMotion();
  const box = iconSize + 16;
  return (
    <motion.button
      {...(rest as object)}
      type="button"
      disabled={disabled}
      whileTap={allowMotion && !disabled ? { scale: 0.9 } : undefined}
      transition={SPRING.press}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-[12px] text-fg-secondary transition-colors duration-150",
        variant === "fill" && "bg-[var(--ib-bg)]",
        variant !== "fill" && "active:bg-[var(--ib-bg)]",
        variant === "border" && "border border-border",
        disabled && "cursor-default opacity-40",
        className
      )}
      style={{ width: box, height: box, color, "--ib-bg": bgColor, ...style } as CSSProperties}
    >
      <Icon style={{ width: iconSize, height: iconSize }} aria-hidden />
    </motion.button>
  );
}
