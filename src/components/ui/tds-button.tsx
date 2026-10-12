"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { SPRING, useAllowMotion } from "./tds-motion";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * TDS Button API를 따르는 자체 구현.
 * 수치는 TDS Button 내부 값 기준 (xlarge 56 / radius 16 / 17px·600 / press 0.96 스프링).
 */

export type ButtonSize = "small" | "medium" | "large" | "xlarge";
export type ButtonColor = "primary" | "danger" | "light" | "dark";
export type ButtonVariant = "fill" | "weak";
export type ButtonDisplay = "inline" | "block" | "full";

type BaseProps = {
  size?: ButtonSize;
  color?: ButtonColor;
  variant?: ButtonVariant;
  display?: ButtonDisplay;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
};

type ButtonAsButton = BaseProps & {
  as?: "button";
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof BaseProps>;

type ButtonAsLink = BaseProps & {
  as: "a";
  href: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof BaseProps | "href">;

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const SIZE: Record<ButtonSize, string> = {
  xlarge: "t5 min-h-[56px] min-w-[96px] rounded-[16px] px-7",
  large: "t5 min-h-[48px] min-w-[80px] rounded-[14px] px-4",
  medium: "t6 min-h-[38px] min-w-[64px] rounded-[10px] px-4",
  small: "t7 min-h-[32px] min-w-[52px] rounded-[8px] px-2.5",
};

/** 로딩 점 크기 / 간격 (px) */
const LOADER: Record<ButtonSize, { dot: number; gap: number }> = {
  xlarge: { dot: 8, gap: 7 },
  large: { dot: 8, gap: 5 },
  medium: { dot: 5, gap: 4 },
  small: { dot: 5, gap: 3 },
};

const COLOR: Record<ButtonColor, Record<ButtonVariant, string>> = {
  primary: {
    fill: "bg-primary text-primary-foreground",
    weak: "bg-accent-soft text-primary",
  },
  danger: {
    fill: "bg-negative text-primary-foreground",
    weak: "bg-negative/10 text-negative",
  },
  light: {
    fill: "bg-divider text-foreground",
    weak: "bg-divider/50 text-fg-secondary",
  },
  dark: {
    fill: "bg-foreground text-card",
    weak: "bg-foreground/10 text-foreground",
  },
};

const DISPLAY: Record<ButtonDisplay, string> = {
  inline: "inline-flex w-auto",
  block: "flex w-full",
  full: "flex w-full rounded-none",
};

const MotionLink = motion.create(Link);

export function Button(props: ButtonProps) {
  const {
    size = "xlarge",
    color = "primary",
    variant = "fill",
    display = "inline",
    loading = false,
    disabled = false,
    className,
    children,
  } = props;

  const inactive = disabled || loading;
  const allowMotion = useAllowMotion();
  const tap =
    allowMotion && display !== "full" && !inactive ? { scale: 0.96 } : undefined;
  const classes = cn(
    "relative shrink-0 select-none items-center justify-center whitespace-nowrap font-semibold",
    "transition-opacity duration-100 ease-out",
    SIZE[size],
    COLOR[color][variant],
    DISPLAY[display],
    disabled && variant === "fill" && "opacity-30",
    inactive && "cursor-default",
    className
  );

  const content = (
    <>
      <span
        className={cn(
          "inline-flex items-center gap-1",
          loading && "opacity-0",
          disabled && variant === "weak" && "opacity-30"
        )}
      >
        {children}
      </span>
      {loading && (
        <span
          role="status"
          aria-label="loading"
          className="absolute inset-0 flex items-center justify-center"
          style={{ gap: LOADER[size].gap }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="animate-pulse rounded-full bg-current"
              style={{
                width: LOADER[size].dot,
                height: LOADER[size].dot,
                animationDelay: `${i * 150}ms`,
              }}
            />
          ))}
        </span>
      )}
    </>
  );

  if (props.as === "a") {
    const {
      as: _as,
      href,
      size: _s,
      color: _c,
      variant: _v,
      display: _d,
      loading: _l,
      disabled: _di,
      className: _cn,
      children: _ch,
      ...rest
    } = props;
    return (
      <MotionLink
        {...(rest as object)}
        href={href}
        whileTap={tap}
        transition={SPRING.press}
        aria-disabled={inactive || undefined}
        aria-busy={loading || undefined}
        tabIndex={inactive ? -1 : rest.tabIndex}
        className={cn(classes, inactive && "pointer-events-none")}
      >
        {content}
      </MotionLink>
    );
  }

  const {
    as: _as,
    size: _s,
    color: _c,
    variant: _v,
    display: _d,
    loading: _l,
    disabled: _di,
    className: _cn,
    children: _ch,
    type,
    ...rest
  } = props;
  return (
    <motion.button
      {...(rest as object)}
      type={type ?? "button"}
      whileTap={tap}
      transition={SPRING.press}
      disabled={inactive}
      aria-busy={loading || undefined}
      className={classes}
    >
      {content}
    </motion.button>
  );
}
