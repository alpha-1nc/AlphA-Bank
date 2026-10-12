"use client";

import { useState, type ButtonHTMLAttributes } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS Switch API를 따르는 자체 구현. 켜짐 accent / 꺼짐 fg-disabled / 노브 흰색.
 * 트랙 색은 120ms, 노브 이동은 스프링(SPRING.toggle). 제어(checked)·비제어(defaultChecked) 모두 지원.
 */

export type SwitchProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "onChange" | "role" | "type" | "defaultChecked"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
};

export function Switch({
  checked: checkedProp,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  className,
  onClick,
  ...rest
}: SwitchProps) {
  const [inner, setInner] = useState(defaultChecked);
  const checked = checkedProp ?? inner;
  const knob = useMotionTransition(SPRING.toggle);

  return (
    <button
      {...rest}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented) return;
        if (checkedProp === undefined) setInner(!checked);
        onCheckedChange?.(!checked);
      }}
      className={cn(
        "relative inline-flex h-[30px] w-[50px] shrink-0 items-center rounded-full p-[2px] transition-colors duration-[120ms] ease-out",
        checked ? "bg-primary" : "bg-fg-disabled",
        disabled && "cursor-default opacity-40",
        className
      )}
    >
      <motion.span
        aria-hidden
        className="h-[26px] w-[26px] rounded-full bg-white"
        initial={false}
        animate={{ x: checked ? 20 : 0 }}
        transition={knob}
      />
    </button>
  );
}
