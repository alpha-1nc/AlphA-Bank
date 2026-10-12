"use client";

import type { ChangeEvent, InputHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useAllowMotion } from "./tds-motion";

/**
 * TDS Checkbox API를 따르는 자체 구현: Checkbox.Circle / Checkbox.Line.
 * 네이티브 input을 숨겨 두고 모양만 그린다 → 제어(checked)·비제어(defaultChecked)·radio 그룹 모두 동작.
 * 누르면 스프링(SPRING.press)으로 0.9까지 줄었다 돌아온다.
 */

export type CheckboxProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  inputType?: "checkbox" | "radio";
  /** 아이콘 크기(px). 기본 24 */
  size?: number;
};

function CheckIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7 12.5l3.2 3.2L17 9"
        stroke="currentColor"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Base({
  shape,
  checked,
  defaultChecked,
  onCheckedChange,
  onChange,
  disabled = false,
  inputType = "checkbox",
  size = 24,
  className,
  ...rest
}: CheckboxProps & { shape: "circle" | "line" }) {
  const allowMotion = useAllowMotion();
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onCheckedChange?.(e.target.checked);
  };

  return (
    <motion.label
      whileTap={allowMotion && !disabled ? { scale: 0.9 } : undefined}
      transition={SPRING.press}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center",
        disabled ? "cursor-default opacity-40" : "cursor-pointer",
        className
      )}
      style={{ width: size, height: size }}
    >
      <input
        {...rest}
        type={inputType}
        checked={checked}
        defaultChecked={checked === undefined ? defaultChecked : undefined}
        onChange={handleChange}
        disabled={disabled}
        className="peer absolute inset-0 m-0 cursor-[inherit] opacity-0"
      />
      {shape === "circle" ? (
        <span
          className="pointer-events-none flex h-full w-full items-center justify-center rounded-full bg-border text-white transition-colors duration-[120ms] peer-checked:bg-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
        >
          <CheckIcon size={size} />
        </span>
      ) : (
        <span
          className="pointer-events-none flex h-full w-full items-center justify-center rounded-[6px] text-fg-disabled transition-colors duration-[120ms] peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
        >
          <CheckIcon size={size} />
        </span>
      )}
    </motion.label>
  );
}

function Circle(props: CheckboxProps) {
  return <Base {...props} shape="circle" />;
}

function Line(props: CheckboxProps) {
  return <Base {...props} shape="line" />;
}

export const Checkbox = { Circle, Line };
