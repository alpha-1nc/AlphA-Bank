"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TDS TextButton API를 따르는 자체 구현.
 * variant: clear(글자만) / underline(밑줄) / arrow(글자 뒤 오른쪽 화살표)
 */

export type TextButtonSize = "xsmall" | "small" | "medium" | "large" | "xlarge" | "xxlarge";

export type TextButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  size: TextButtonSize;
  variant?: "arrow" | "underline" | "clear";
  disabled?: boolean;
  children?: ReactNode;
};

/** 확정 타이포 (새 TDS 체계) */
const SIZE: Record<TextButtonSize, string> = {
  xsmall: "st12", // 12/18
  small: "t7", // 13/19.5
  medium: "st11", // 14/21
  large: "t6", // 15/22.5
  xlarge: "t5", // 17/25.5
  xxlarge: "t4", // 20/29
};

export function TextButton({
  size,
  variant = "clear",
  disabled = false,
  className,
  children,
  type,
  ...rest
}: TextButtonProps) {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      disabled={disabled}
      className={cn(
        "inline-flex items-center gap-0.5 font-semibold text-fg-secondary transition-opacity duration-100 active:opacity-60",
        SIZE[size],
        variant === "underline" && "underline underline-offset-[3px]",
        disabled && "cursor-default opacity-40 active:opacity-40",
        className
      )}
    >
      {children}
      {variant === "arrow" && <ChevronRight className="h-[1.1em] w-[1.1em]" aria-hidden />}
    </button>
  );
}
