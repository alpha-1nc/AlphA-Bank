"use client";

import { isValidElement, type ElementType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { FADE, SPRING, useMotionTransition } from "./tds-motion";
import { useBodyScrollLock, useEscape, useMounted } from "./tds-overlay-utils";
import { TextButton, type TextButtonProps, type TextButtonSize } from "./tds-text-button";

/**
 * TDS AlertDialog API를 따르는 자체 구현 (버튼 하나짜리 알림).
 * onClose를 주지 않으면 닫히지 않는다. closeOnBackEvent는 웹에서 Esc 키로 대응한다.
 * DialogShell·DialogTitle·DialogDescription은 ConfirmDialog와 공유한다.
 */

export type DialogTypography =
  | "t1" | "st1" | "st2" | "st3" | "t2" | "st4" | "st5" | "st6" | "t3" | "st7"
  | "t4" | "st8" | "st9" | "t5" | "st10" | "t6" | "st11" | "t7" | "st12" | "st13";
export type DialogFontWeight = "regular" | "medium" | "semibold" | "bold";

const WEIGHT: Record<DialogFontWeight, string> = {
  regular: "font-regular",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export type DialogTextProps = {
  as?: ElementType;
  /** CSS 색 값 */
  color?: string;
  typography?: DialogTypography;
  fontWeight?: DialogFontWeight;
  className?: string;
  children?: ReactNode;
  id?: string;
};

export function DialogTitle({
  as: As = "h3",
  color = "var(--adaptiveGrey800)",
  typography = "t4",
  fontWeight = "bold",
  className,
  children,
  id,
}: DialogTextProps) {
  return (
    <As id={id} className={cn(typography, WEIGHT[fontWeight], className)} style={{ color }}>
      {children}
    </As>
  );
}

export function DialogDescription({
  as: As = "h3",
  color = "var(--adaptiveGrey600)",
  typography = "t6",
  fontWeight = "medium",
  className,
  children,
  id,
}: DialogTextProps) {
  return (
    <As id={id} className={cn("whitespace-pre-line", typography, WEIGHT[fontWeight], className)} style={{ color }}>
      {children}
    </As>
  );
}

export type DialogShellProps = {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  footer: ReactNode;
  closeOnDimmerClick?: boolean;
  closeOnBackEvent?: boolean;
  onClose?: () => void;
  onEntered?: () => void;
  onExited?: () => void;
  portalContainer?: HTMLElement | null;
};

/** 확정 수치: 카드 최대 폭 360 · radius 20 · 안쪽 여백 위 24 / 좌우 24 / 아래 16, 제목-설명 8, 설명-버튼 24 */
export function DialogShell({
  open,
  title,
  description,
  footer,
  closeOnDimmerClick = true,
  closeOnBackEvent = true,
  onClose,
  onEntered,
  onExited,
  portalContainer,
}: DialogShellProps) {
  const mounted = useMounted();
  const pop = useMotionTransition(SPRING.dialog);
  const fade = useMotionTransition(FADE);
  useBodyScrollLock(open);
  useEscape(open && closeOnBackEvent, () => onClose?.());
  if (!mounted) return null;

  const titleNode = title == null ? null : isValidElement(title) ? title : <DialogTitle>{title}</DialogTitle>;
  const descNode =
    description == null ? null : isValidElement(description) ? (
      description
    ) : (
      <DialogDescription>{description}</DialogDescription>
    );

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <div key="tds-dialog-shell" className="fixed inset-0 z-[1050] flex items-center justify-center p-6">
          <motion.div
            aria-hidden
            className="absolute inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            onClick={() => closeOnDimmerClick && onClose?.()}
          />
          <motion.div
            role="alertdialog"
            aria-modal="true"
            className="relative w-full max-w-[360px] rounded-card bg-card px-6 pb-4 pt-6"
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ ...pop, opacity: fade }}
            onAnimationComplete={(def) => {
              if (typeof def === "object" && def !== null && "scale" in def && def.scale === 1) onEntered?.();
            }}
          >
            {titleNode}
            {descNode && <div className={cn(titleNode && "mt-2")}>{descNode}</div>}
            <div className="mt-6">{footer}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalContainer ?? document.body
  );
}

/* ── AlertDialog ──────────────────────────────────────────────────────── */
export type AlertDialogProps = Omit<DialogShellProps, "footer"> & {
  /** 문자열이면 AlertDialog.AlertButton으로 감싸고 누르면 onClose */
  alertButton?: ReactNode;
};

export type AlertDialogAlertButtonProps = Omit<TextButtonProps, "size" | "color"> & {
  size?: TextButtonSize;
  /** CSS 색 값. 기본 accent */
  color?: string;
  fontWeight?: DialogFontWeight;
};

function AlertButton({
  size = "medium",
  color = "var(--primary)",
  fontWeight = "bold",
  variant = "clear",
  className,
  style,
  ...rest
}: AlertDialogAlertButtonProps) {
  return (
    <TextButton
      {...rest}
      size={size}
      variant={variant}
      className={cn(WEIGHT[fontWeight], "px-2 py-2", className)}
      style={{ color, ...style }}
    />
  );
}

function AlertDialogRoot({ alertButton = "확인", onClose, ...props }: AlertDialogProps) {
  const button = isValidElement(alertButton) ? (
    alertButton
  ) : (
    <AlertButton onClick={() => onClose?.()}>
      {alertButton}
    </AlertButton>
  );
  return <DialogShell {...props} onClose={onClose} footer={<div className="-mr-2 flex justify-end">{button}</div>} />;
}

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Title: DialogTitle,
  Description: DialogDescription,
  AlertButton,
});
