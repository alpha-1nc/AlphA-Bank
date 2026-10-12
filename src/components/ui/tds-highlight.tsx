"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { FADE, useMotionTransition } from "./tds-motion";
import { useMounted } from "./tds-overlay-utils";

/**
 * TDS Highlight API를 따르는 자체 구현.
 * children을 감싸고, open이면 화면 전체를 어둡게 덮되 children 영역만 뚫어 밝게 보여준다 (SVG 마스크).
 * 메시지는 강조 영역 바깥에, 정렬은 화면과 영역 위치를 비교해 자동으로 정한다.
 */

type MessageRender = (props: { color: string; style: CSSProperties }) => ReactElement;

export type HighlightProps = {
  open: boolean;
  /** 강조 영역 바깥 여백(px). 기본 0 */
  padding?: number;
  /** 열릴 때 지연(초). 기본 0 */
  delay?: number;
  highlighterClassname?: string;
  message?: string | MessageRender;
  /** 기본 흰색 */
  messageColor?: string;
  messageXAlignment?: "left" | "center" | "right";
  messageYAlignment?: "top" | "bottom";
  /** 딤 영역을 누르면 */
  onClick?: () => void;
  onExited?: () => void;
  children?: ReactNode;
};

/** 확정 수치 */
const DIM = "rgba(0,0,0,0.6)"; // 딤 색
const HOLE_RADIUS = 12; // 강조 영역 모서리
const MESSAGE_GAP = 12; // 강조 영역과 메시지 사이
const EDGE = 16; // 메시지와 화면 끝 최소 거리

type Rect = { x: number; y: number; w: number; h: number };

export function Highlight({
  open,
  padding = 0,
  delay = 0,
  highlighterClassname,
  message,
  messageColor = "#ffffff",
  messageXAlignment,
  messageYAlignment,
  onClick,
  onExited,
  children,
}: HighlightProps) {
  const mounted = useMounted();
  const fade = useMotionTransition(FADE);
  const targetRef = useRef<HTMLDivElement>(null);
  const maskId = `tds-hl-${useId().replace(/:/g, "")}`;
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  // delay(초) 뒤에 켠다
  useEffect(() => {
    if (!open) {
      setActive(false);
      return;
    }
    const t = window.setTimeout(() => setActive(true), Math.max(0, delay) * 1000);
    return () => window.clearTimeout(t);
  }, [open, delay]);

  // 켜져 있는 동안 위치 추적 (스크롤·리사이즈)
  useLayoutEffect(() => {
    if (!active) return;
    const measure = () => {
      const el = targetRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ x: r.left - padding, y: r.top - padding, w: r.width + padding * 2, h: r.height + padding * 2 });
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, padding]);

  const yAlign: "top" | "bottom" =
    messageYAlignment ?? (rect && rect.y + rect.h / 2 > viewport.h / 2 ? "top" : "bottom");
  const xAlign: "left" | "center" | "right" =
    messageXAlignment ??
    (rect
      ? rect.x + rect.w / 2 < viewport.w / 3
        ? "left"
        : rect.x + rect.w / 2 > (viewport.w * 2) / 3
          ? "right"
          : "center"
      : "center");

  const messageStyle: CSSProperties = rect
    ? {
        position: "fixed",
        maxWidth: `calc(100vw - ${EDGE * 2}px)`,
        ...(yAlign === "bottom"
          ? { top: rect.y + rect.h + MESSAGE_GAP }
          : { bottom: viewport.h - rect.y + MESSAGE_GAP }),
        ...(xAlign === "left"
          ? { left: Math.max(EDGE, rect.x) }
          : xAlign === "right"
            ? { right: Math.max(EDGE, viewport.w - (rect.x + rect.w)) }
            : { left: rect.x + rect.w / 2, transform: "translateX(-50%)" }),
        textAlign: xAlign,
      }
    : {};

  const messageNode =
    message == null ? null : typeof message === "string" ? (
      <p className="t5 whitespace-pre-line font-semibold" style={{ ...messageStyle, color: messageColor }}>
        {message}
      </p>
    ) : (
      <div style={messageStyle}>{message({ color: messageColor, style: { color: messageColor } })}</div>
    );

  return (
    <>
      <div ref={targetRef}>{children}</div>
      {mounted &&
        createPortal(
          <AnimatePresence onExitComplete={onExited}>
            {active && rect && (
              <motion.div
                key="tds-highlight"
                className="fixed inset-0 z-[1200]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={fade}
                onClick={onClick}
              >
                <svg className="absolute inset-0 h-full w-full" aria-hidden>
                  <defs>
                    <mask id={maskId}>
                      <rect width="100%" height="100%" fill="white" />
                      <rect x={rect.x} y={rect.y} width={rect.w} height={rect.h} rx={HOLE_RADIUS} fill="black" />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill={DIM} mask={`url(#${maskId})`} />
                </svg>
                <div
                  aria-hidden
                  className={cn("pointer-events-none fixed", highlighterClassname)}
                  style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, borderRadius: HOLE_RADIUS }}
                />
                {messageNode}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  );
}
