"use client";

import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, type PanInfo } from "motion/react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE, SPRING, useMotionTransition } from "./tds-motion";
import { useMounted } from "./tds-overlay-utils";

/**
 * TDS Toast API를 따르는 자체 구현.
 * duration 후 자동으로 onClose. 바깥 방향(top이면 위, bottom이면 아래)으로 끌어도 닫힌다.
 * onClose는 닫히기 시작할 때, onExited는 퇴장 애니메이션이 끝난 뒤.
 */

export type ToastProps = {
  open: boolean;
  position: "top" | "bottom";
  text: string;
  leftAddon?: ReactNode;
  /** bottom에서만 */
  button?: ReactNode;
  /** 기본 3000, button이 있으면 5000 (ms) */
  duration?: number;
  onClose?: () => void;
  onExited?: () => void;
  /** bottom에서만: 하단 CTA 위로 띄운다 */
  higherThanCTA?: boolean;
  "aria-live"?: "assertive" | "polite";
  /** 화면 끝에서의 거리(px). useToast의 gap 옵션용 */
  gap?: number;
};

/** 확정 수치 */
const EDGE = 16; // 화면 끝 여백
const CTA_OFFSET = 96; // higherThanCTA: CTA(56) + 위아래 여백
const DISMISS_DISTANCE = 40; // 이만큼 끌면 닫힘 (px)
const DISMISS_VELOCITY = 400; // 또는 이 속도 이상 (px/s)

function ToastRoot({
  open,
  position,
  text,
  leftAddon,
  button,
  duration,
  onClose,
  onExited,
  higherThanCTA = false,
  "aria-live": ariaLive = "polite",
  gap,
}: ToastProps) {
  const mounted = useMounted();
  const pop = useMotionTransition(SPRING.dialog);
  const fade = useMotionTransition(FADE);
  const isBottom = position === "bottom";
  const showButton = isBottom && button != null;
  const ms = duration ?? (showButton ? 5000 : 3000);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => onCloseRef.current?.(), ms);
    return () => window.clearTimeout(t);
  }, [open, ms]);

  if (!mounted) return null;

  const offset = gap ?? (isBottom && higherThanCTA ? CTA_OFFSET : EDGE);
  const from = isBottom ? 24 : -24;

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const d = isBottom ? info.offset.y : -info.offset.y;
    const v = isBottom ? info.velocity.y : -info.velocity.y;
    if (d > DISMISS_DISTANCE || v > DISMISS_VELOCITY) onCloseRef.current?.();
  };

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <motion.div
          key="tds-toast"
          role="status"
          aria-live={ariaLive}
          className="pointer-events-none fixed inset-x-0 z-[1100] flex justify-center px-4"
          style={
            isBottom
              ? { bottom: `calc(${offset}px + env(safe-area-inset-bottom))` }
              : { top: `calc(${offset}px + env(safe-area-inset-top))` }
          }
        >
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={isBottom ? { top: 0.1, bottom: 0.8 } : { top: 0.8, bottom: 0.1 }}
            onDragEnd={handleDragEnd}
            initial={{ y: from, opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: from, opacity: 0, scale: 0.96 }}
            transition={{ ...pop, opacity: fade }}
            className="pointer-events-auto flex w-full max-w-[420px] touch-none items-center gap-3 rounded-[18px] bg-foreground py-3.5 pl-4 pr-3 text-card"
          >
            {leftAddon != null && <span className="flex shrink-0 items-center">{leftAddon}</span>}
            <p className="t6 min-w-0 flex-1 whitespace-pre-line font-medium">{text}</p>
            {showButton && <span className="shrink-0">{button}</span>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ── Toast.Button ─────────────────────────────────────────────────────── */
export type ToastButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  children: ReactNode;
};

function ToastButton({ children, className, type, ...rest }: ToastButtonProps) {
  return (
    <button
      {...rest}
      type={type ?? "button"}
      className={cn(
        "t6 rounded-[10px] px-2 py-1 font-semibold text-primary transition-opacity active:opacity-60",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ── Toast.Icon ───────────────────────────────────────────────────────── */
export type ToastIconProps = {
  icon: LucideIcon;
  /** 기본 24 */
  size?: number;
  /** useToast의 iconType: 원형·사각 배경 */
  iconType?: "circle" | "square";
  className?: string;
};

function ToastIcon({ icon: Icon, size = 24, iconType, className }: ToastIconProps) {
  if (!iconType) {
    return <Icon aria-hidden className={cn("shrink-0", className)} style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center bg-card/15",
        iconType === "circle" ? "rounded-full" : "rounded-[8px]",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Icon style={{ width: size * 0.6, height: size * 0.6 }} />
    </span>
  );
}

export const Toast = Object.assign(ToastRoot, { Button: ToastButton, Icon: ToastIcon });
