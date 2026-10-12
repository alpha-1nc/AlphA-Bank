"use client";

import { createContext, useContext, type HTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { FADE, SPRING, useMotionTransition } from "./tds-motion";
import { useBodyScrollLock, useEscape, useMounted } from "./tds-overlay-utils";

/**
 * TDS Modal API를 따르는 자체 구현 — 화면 가운데 뜨는 범용 모달.
 * <Modal open onOpenChange><Modal.Overlay /><Modal.Content>…</Modal.Content></Modal>
 * Content의 모양(배경·radius·폭)은 사용처가 className으로 정한다.
 */

export type ModalProps = {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onExited?: () => void;
  portalContainer?: HTMLElement | null;
  children?: ReactNode;
};

const ModalContext = createContext<{ close: () => void } | null>(null);

function ModalRoot({ open, onOpenChange, onExited, portalContainer, children }: ModalProps) {
  const mounted = useMounted();
  useBodyScrollLock(open);
  useEscape(open, () => onOpenChange?.(false));
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <ModalContext.Provider key="tds-modal" value={{ close: () => onOpenChange?.(false) }}>
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">{children}</div>
        </ModalContext.Provider>
      )}
    </AnimatePresence>,
    portalContainer ?? document.body
  );
}

export type ModalOverlayProps = { onClick?: () => void; className?: string };

function Overlay({ onClick, className }: ModalOverlayProps) {
  const ctx = useContext(ModalContext);
  const fade = useMotionTransition(FADE);
  return (
    <motion.div
      aria-hidden
      className={cn("absolute inset-0 bg-black/50", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={fade}
      onClick={onClick ?? ctx?.close}
    />
  );
}

export type ModalContentProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "onAnimationStart" | "onDrag" | "onDragStart" | "onDragEnd"
>;

function Content({ className, children, ...rest }: ModalContentProps) {
  const pop = useMotionTransition(SPRING.dialog);
  const fade = useMotionTransition(FADE);
  return (
    <motion.div
      {...rest}
      role="dialog"
      aria-modal="true"
      className={cn("relative", className)}
      initial={{ scale: 0.94, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.96, opacity: 0 }}
      transition={{ ...pop, opacity: fade }}
    >
      {children}
    </motion.div>
  );
}

export const Modal = Object.assign(ModalRoot, { Overlay, Content });
