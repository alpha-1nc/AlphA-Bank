"use client";

import {
  isValidElement,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, type ButtonProps } from "./tds-button";
import { FADE, SPRING, useAllowMotion, useMotionTransition } from "./tds-motion";
import { useBodyScrollLock, useEscape, useMounted } from "./tds-overlay-utils";

/**
 * TDS BottomSheet API를 따르는 자체 구현.
 * 아래에서 올라오고, 핸들바(와 내용이 스크롤되지 않을 때는 내용)를 아래로 끌어 닫는다.
 * expandBottomSheet: 내용이 스크롤되는 상태에서 위로 10px 이상 끌면 전체 화면으로 확장.
 */

export type BottomSheetProps = {
  open: boolean;
  header?: ReactNode;
  headerDescription?: ReactNode;
  cta?: ReactNode;
  children?: ReactNode;
  className?: string;
  dimmerClassName?: string;
  disableDimmer?: boolean;
  /** 키보드가 올라오면 시트를 키보드 위로 올린다 */
  hasTextField?: boolean;
  disableChildrenDragging?: boolean;
  /** true 면 시트를 쓸 수 있는 최대 높이로 고정하고, 본문은 스크롤 없이 자식(flex-1 min-h-0)에게 높이를 넘긴다 */
  bodyFill?: boolean;
  expandBottomSheet?: boolean;
  maxHeight?: number;
  expandedMaxHeight?: number;
  expandBottomSheetWhenScroll?: boolean;
  /** 내용과 CTA 사이 간격(px). 기본 34 */
  ctaContentGap?: number;
  onClose?: () => void;
  onExpanded?: () => void;
  onDimmerClick?: () => void;
  onEntered?: () => void;
  onExited?: () => void;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
  portalContainer?: HTMLElement | null;
};

/** 확정 수치 */
const CLOSE_DISTANCE = 100; // 아래로 이만큼(px) 끌면 닫힘
const CLOSE_VELOCITY = 500; // 또는 이 속도(px/s) 이상으로 놓으면 닫힘
const EXPAND_DISTANCE = 10; // 위로 이만큼(px) 끌면 확장
const DEFAULT_MAX_HEIGHT = "calc(100dvh - 64px)";
const DEFAULT_EXPANDED_MAX_HEIGHT = "calc(100dvh - env(safe-area-inset-top) - 8px)";

/** 키보드 높이 (visualViewport 기준) */
export function useKeyboardOffset(active: boolean) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!active || !vv) return;
    const update = () => setOffset(Math.max(0, window.innerHeight - vv.height - vv.offsetTop));
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      setOffset(0);
    };
  }, [active]);
  return offset;
}

function BottomSheetRoot({
  open,
  header,
  headerDescription,
  cta,
  children,
  className,
  dimmerClassName,
  disableDimmer = false,
  hasTextField = false,
  disableChildrenDragging = false,
  bodyFill = false,
  expandBottomSheet = false,
  maxHeight,
  expandedMaxHeight,
  expandBottomSheetWhenScroll = false,
  ctaContentGap = 34,
  onClose,
  onExpanded,
  onDimmerClick,
  onEntered,
  onExited,
  ariaLabelledBy,
  ariaDescribedBy,
  portalContainer,
}: BottomSheetProps) {
  const mounted = useMounted();
  const sheetSpring = useMotionTransition(SPRING.sheet);
  const fade = useMotionTransition(FADE);
  const allowMotion = useAllowMotion();
  const dragControls = useDragControls();
  const contentRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const keyboard = useKeyboardOffset(open && hasTextField);

  useBodyScrollLock(open && !disableDimmer);
  useEscape(open, () => onClose?.());

  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  if (!mounted) return null;

  const contentScrollable = () => {
    const el = contentRef.current;
    return !!el && el.scrollHeight > el.clientHeight + 1;
  };

  const expand = () => {
    if (expanded) return;
    setExpanded(true);
    onExpanded?.();
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > CLOSE_DISTANCE || info.velocity.y > CLOSE_VELOCITY) {
      onClose?.();
      return;
    }
    if (expandBottomSheet && info.offset.y < -EXPAND_DISTANCE && contentScrollable()) expand();
  };

  const startDrag = (e: ReactPointerEvent) => dragControls.start(e);

  const headerNode =
    header == null ? null : typeof header === "string" ? <Header>{header}</Header> : header;
  const descNode =
    headerDescription == null ? null : typeof headerDescription === "string" ? (
      <HeaderDescription>{headerDescription}</HeaderDescription>
    ) : (
      headerDescription
    );

  const height = expanded
    ? expandedMaxHeight != null
      ? `${expandedMaxHeight}px`
      : DEFAULT_EXPANDED_MAX_HEIGHT
    : undefined;
  const max = expanded ? height : maxHeight != null ? `${maxHeight}px` : DEFAULT_MAX_HEIGHT;
  // bodyFill: 키보드가 올라오면 그만큼 줄여 시트가 화면 밖으로 밀리지 않게 한다
  const fillHeight = bodyFill && keyboard > 0 ? `min(${max}, calc(100dvh - 64px - ${keyboard}px))` : max;

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open && (
        <div key="tds-bottom-sheet" className="fixed inset-0 z-[1000] flex items-end justify-center pointer-events-none">
          {!disableDimmer && (
            <motion.div
              className={cn("pointer-events-auto absolute inset-0 bg-black/40", dimmerClassName)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={fade}
              onClick={() => (onDimmerClick ? onDimmerClick() : onClose?.())}
            />
          )}
          <motion.div
            role="dialog"
            aria-modal={!disableDimmer}
            aria-labelledby={ariaLabelledBy}
            aria-describedby={ariaDescribedBy}
            drag={allowMotion ? "y" : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 0.9 }}
            onDragEnd={handleDragEnd}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={sheetSpring}
            onAnimationComplete={(def) => {
              if (typeof def === "object" && def !== null && "y" in def && def.y === 0) onEntered?.();
            }}
            className={cn(
              "pointer-events-auto relative flex w-full max-w-[560px] flex-col overflow-hidden rounded-t-[24px] bg-card text-foreground",
              className
            )}
            style={{ maxHeight: fillHeight, height: bodyFill ? fillHeight : height, marginBottom: keyboard }}
          >
            {/* 핸들바 */}
            <div onPointerDown={startDrag} className="flex shrink-0 cursor-grab touch-none justify-center pb-1 pt-2">
              <span className="h-1 w-9 rounded-full bg-fg-disabled" />
            </div>
            {(headerNode || descNode) && (
              <div onPointerDown={startDrag} className="shrink-0 touch-none px-6 pb-2 pt-3">
                {headerNode}
                {descNode && <div className="mt-1">{descNode}</div>}
              </div>
            )}
            <div
              ref={contentRef}
              onPointerDown={(e) => {
                if (!bodyFill && !disableChildrenDragging && !contentScrollable()) startDrag(e);
              }}
              onScroll={(e) => {
                if (expandBottomSheetWhenScroll && e.currentTarget.scrollTop > 0) expand();
              }}
              className={cn(
                "min-h-0 flex-1 overscroll-contain px-6",
                bodyFill ? "flex flex-col overflow-y-hidden" : "overflow-y-auto"
              )}
            >
              {children}
            </div>
            <div
              className="shrink-0 px-6"
              style={{
                paddingTop: cta != null ? ctaContentGap : 0,
                paddingBottom: "calc(16px + env(safe-area-inset-bottom))",
              }}
            >
              {cta}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    portalContainer ?? document.body
  );
}

/* ── 하위 컴포넌트 ─────────────────────────────────────────────────────── */
function Header({ children, className }: { children: ReactNode; className?: string }) {
  if (typeof children === "string") {
    return <h1 className={cn("t4 font-bold text-foreground", className)}>{children}</h1>;
  }
  return <div className={className}>{children}</div>;
}

function HeaderDescription({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("t6 text-fg-secondary", className)}>{children}</p>;
}

function CTA({ children, ...props }: ButtonProps) {
  return (
    <Button size="xlarge" display="block" {...(props as object)}>
      {children}
    </Button>
  );
}

function asButton(node: ReactNode, color: "light" | "primary") {
  if (isValidElement(node) || node == null) return node;
  return (
    <Button size="xlarge" display="block" color={color}>
      {node}
    </Button>
  );
}

function DoubleCTA({ leftButton, rightButton }: { leftButton: ReactNode; rightButton: ReactNode }) {
  return (
    <div className="flex gap-2 [&>*]:min-w-0 [&>*]:flex-1">
      {asButton(leftButton, "light")}
      {asButton(rightButton, "primary")}
    </div>
  );
}

export type BottomSheetSelectOption = {
  name: ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
  hideUnCheckedCheckBox?: boolean;
};

export type BottomSheetSelectProps = {
  options: BottomSheetSelectOption[];
  onChange: (value: string) => void;
  value?: string;
  /** 항목이 차례로 나타나는 애니메이션. 기본 true */
  animation?: boolean;
  /** 첫 항목 애니메이션 시작 지연(ms) */
  animationDelay?: number;
};

function Select({ options, onChange, value, animation = true, animationDelay = 0 }: BottomSheetSelectProps) {
  const allowMotion = useAllowMotion();
  const animate = animation && allowMotion;
  return (
    <div role="radiogroup" className="-mx-6 flex flex-col">
      {options.map((o, i) => {
        const selected = o.value === value;
        return (
          <motion.button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            initial={animate ? { opacity: 0, y: 8 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING.slide, delay: animate ? animationDelay / 1000 + i * 0.04 : 0 }}
            className={cn(
              "t5 flex w-full items-center justify-between gap-3 px-6 py-4 text-left transition-colors active:bg-divider",
              selected ? "font-semibold text-foreground" : "font-medium text-fg-secondary",
              o.disabled && "cursor-default opacity-40 active:bg-transparent",
              o.className
            )}
          >
            <span className="min-w-0 flex-1 truncate">{o.name}</span>
            {(selected || !o.hideUnCheckedCheckBox) && (
              <Check
                aria-hidden
                className={cn("h-6 w-6 shrink-0", selected ? "text-primary" : "text-fg-disabled")}
                strokeWidth={2.4}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

export const BottomSheet = Object.assign(BottomSheetRoot, {
  Header,
  HeaderDescription,
  CTA,
  DoubleCTA,
  Select,
});
