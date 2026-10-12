"use client";

import {
  isValidElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type Ref,
} from "react";
import { motion, type TargetAndTransition, type Transition } from "motion/react";
import { cn } from "@/lib/utils";
import { useKeyboardOffset } from "./tds-bottom-sheet";
import { Button } from "./tds-button";
import { FADE, SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS BottomCTA API를 따르는 자체 구현.
 * BottomCTA(= BottomCTA.Single) / BottomCTA.Double / FixedBottomCTA(fixed=true) / FixedBottomCTA.Double
 *
 * show: 문서를 확인하지 못해 "true면 hideOnScroll·showAfterDelay와 상관없이 항상 보인다"로 해석했다 (기본 false = 평소 동작).
 */

type ShowAfterDelay = { animation: "slide" | "fade" | "scale"; delay: number };

type CommonProps = {
  /** delay는 초 단위 */
  showAfterDelay?: ShowAfterDelay;
  show?: boolean;
  hideOnScroll?: boolean;
  /** px. 기본 1 */
  hideOnScrollDistanceThreshold?: number;
  hasSafeAreaPadding?: boolean;
  hasPaddingBottom?: boolean;
  /** fixed일 때 레이아웃 자리 차지. fixed면 기본 true */
  takeSpace?: boolean;
  fixed?: boolean;
  containerStyle?: CSSProperties;
  containerRef?: Ref<HTMLDivElement>;
  background?: "default" | "none";
  topAccessory?: ReactNode;
  bottomAccessory?: ReactNode;
  className?: string;
};

export type BottomCTASingleProps = CommonProps & {
  children: ReactNode;
  /** fixed일 때 키보드 위로 올라간다 */
  fixedAboveKeyboard?: boolean;
};

export type BottomCTADoubleProps = CommonProps & {
  leftButton: ReactNode;
  rightButton: ReactNode;
};

/** 확정 수치 */
const SIDE_PADDING = 20; // 좌우
const TOP_PADDING = 12; // 버튼 위 (그라데이션 아래)
const GRADIENT = 24; // background="default"의 위쪽 페이드 높이
const BOTTOM_NO_SAFE = 20; // hasSafeAreaPadding=false일 때 아래 여백

/** 가장 가까운 세로 스크롤 조상 (없으면 window) */
function findScrollParent(el: HTMLElement | null): HTMLElement | Window {
  let node = el?.parentElement ?? null;
  while (node) {
    const oy = getComputedStyle(node).overflowY;
    if ((oy === "auto" || oy === "scroll") && node.scrollHeight > node.clientHeight) return node;
    node = node.parentElement;
  }
  return window;
}

function useHideOnScroll(enabled: boolean, threshold: number, anchor: React.RefObject<HTMLDivElement | null>) {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    if (!enabled) {
      setHidden(false);
      return;
    }
    const target = findScrollParent(anchor.current);
    const read = () => (target instanceof Window ? window.scrollY : target.scrollTop);
    let last = read();
    const onScroll = () => {
      const y = read();
      const dy = y - last;
      if (Math.abs(dy) < threshold) return;
      setHidden(dy > 0); // 아래로 스크롤 → 숨김, 위로 → 표시
      last = y;
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    return () => target.removeEventListener("scroll", onScroll);
  }, [enabled, threshold, anchor]);
  return hidden;
}

function useDelayedShow(cfg: ShowAfterDelay | undefined) {
  const [ready, setReady] = useState(!cfg);
  useEffect(() => {
    if (!cfg) {
      setReady(true);
      return;
    }
    setReady(false);
    const t = window.setTimeout(() => setReady(true), Math.max(0, cfg.delay) * 1000);
    return () => window.clearTimeout(t);
  }, [cfg?.delay, cfg?.animation]); // eslint-disable-line react-hooks/exhaustive-deps
  return ready;
}

function hiddenState(animation: ShowAfterDelay["animation"] | "scroll"): TargetAndTransition {
  if (animation === "fade") return { opacity: 0 };
  if (animation === "scale") return { opacity: 0, scale: 0.9 };
  return { y: "120%", opacity: 0 };
}

function BottomCTABase({
  content,
  showAfterDelay,
  show = false,
  hideOnScroll = false,
  hideOnScrollDistanceThreshold = 1,
  hasSafeAreaPadding = true,
  hasPaddingBottom = true,
  takeSpace,
  fixed = false,
  containerStyle,
  containerRef,
  background = "default",
  topAccessory,
  bottomAccessory,
  fixedAboveKeyboard = false,
  className,
}: CommonProps & { content: ReactNode; fixedAboveKeyboard?: boolean }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHeight, setBoxHeight] = useState(0);
  const spring = useMotionTransition(SPRING.sheet);
  const fade = useMotionTransition(FADE);
  const scrolledAway = useHideOnScroll(hideOnScroll && !show, hideOnScrollDistanceThreshold, anchorRef);
  const delayedReady = useDelayedShow(show ? undefined : showAfterDelay);
  const keyboard = useKeyboardOffset(fixed && fixedAboveKeyboard);
  const occupy = fixed && (takeSpace ?? true);

  // takeSpace: 고정된 CTA 높이만큼 자리 확보
  useLayoutEffect(() => {
    if (!occupy || !boxRef.current) return;
    const el = boxRef.current;
    const ro = new ResizeObserver(() => setBoxHeight(el.offsetHeight));
    ro.observe(el);
    setBoxHeight(el.offsetHeight);
    return () => ro.disconnect();
  }, [occupy]);

  const visible = show || (delayedReady && !scrolledAway);
  const hideAnim = !delayedReady && showAfterDelay ? showAfterDelay.animation : "scroll";
  const transition: Transition = hideAnim === "fade" ? fade : { ...spring, opacity: fade };

  const paddingBottom = !hasPaddingBottom
    ? 0
    : hasSafeAreaPadding
      ? `max(${BOTTOM_NO_SAFE}px, env(safe-area-inset-bottom))`
      : BOTTOM_NO_SAFE;

  const box = (
    <motion.div
      ref={(node) => {
        (boxRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof containerRef === "function") containerRef(node);
        else if (containerRef) (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }}
      initial={false}
      animate={visible ? { y: 0, opacity: 1, scale: 1 } : hiddenState(hideAnim)}
      transition={transition}
      aria-hidden={!visible || undefined}
      className={cn(
        "w-full",
        fixed && "fixed inset-x-0 bottom-0 z-[900]",
        !visible && "pointer-events-none",
        className
      )}
      style={{
        paddingLeft: SIDE_PADDING,
        paddingRight: SIDE_PADDING,
        paddingTop: background === "default" ? GRADIENT : TOP_PADDING,
        paddingBottom,
        marginBottom: keyboard || undefined,
        background:
          background === "default"
            ? `linear-gradient(to bottom, transparent, var(--background) ${GRADIENT}px)`
            : undefined,
        ...containerStyle,
      }}
    >
      {topAccessory != null && <div className="mb-3">{topAccessory}</div>}
      {content}
      {bottomAccessory != null && <div className="mt-3">{bottomAccessory}</div>}
    </motion.div>
  );

  return (
    <div ref={anchorRef} style={occupy ? { height: boxHeight } : undefined}>
      {box}
    </div>
  );
}

function asButton(node: ReactNode, color: "primary" | "light") {
  if (node == null || isValidElement(node)) return node;
  return (
    <Button size="xlarge" display="block" color={color}>
      {node}
    </Button>
  );
}

function Single({ children, ...rest }: BottomCTASingleProps) {
  return <BottomCTABase {...rest} content={asButton(children, "primary")} />;
}

function Double({ leftButton, rightButton, ...rest }: BottomCTADoubleProps) {
  return (
    <BottomCTABase
      {...rest}
      content={
        <div className="flex gap-2 [&>*]:min-w-0 [&>*]:flex-1">
          {asButton(leftButton, "light")}
          {asButton(rightButton, "primary")}
        </div>
      }
    />
  );
}

export const BottomCTA = Object.assign(Single, { Single, Double });

function FixedSingle(props: BottomCTASingleProps) {
  return <Single {...props} fixed />;
}

function FixedDouble(props: BottomCTADoubleProps) {
  return <Double {...props} fixed />;
}

export const FixedBottomCTA = Object.assign(FixedSingle, { Double: FixedDouble });
