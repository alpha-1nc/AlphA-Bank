"use client";

import { useReducedMotion, type Transition } from "motion/react";

/**
 * 공용 컴포넌트 스프링 설정 (토스 느낌: 딱딱한 ease 대신 살짝 튕기는 스프링).
 * 감쇠비 ζ = damping / (2·√(stiffness·mass)) — 1 미만이면 살짝 튕긴다.
 */
export const SPRING = {
  /** 누름(press) 축소·복귀 — ζ≈0.79 */
  press: { type: "spring", stiffness: 600, damping: 30, mass: 0.6 },
  /** Switch 노브·Checkbox 체크 — ζ≈0.63, 눈에 띄게 한 번 튕김 */
  toggle: { type: "spring", stiffness: 500, damping: 28, mass: 1 },
  /** Dialog 등장·퇴장 — ζ≈0.72 */
  dialog: { type: "spring", stiffness: 380, damping: 28, mass: 1 },
  /** BottomSheet 올라옴·되돌아감 — ζ≈0.93, 거의 튕기지 않고 묵직하게 */
  sheet: { type: "spring", stiffness: 420, damping: 38, mass: 1 },
  /** Tab 밑줄·SegmentedControl pill 미끄러짐 — ζ≈0.78 */
  slide: { type: "spring", stiffness: 500, damping: 35, mass: 1 },
} satisfies Record<string, Transition>;

/** 색·투명도처럼 튕기면 어색한 값용 */
export const FADE: Transition = { type: "tween", duration: 0.15, ease: "easeOut" };

const INSTANT: Transition = { duration: 0 };

/** prefers-reduced-motion이 켜져 있으면 즉시 전환(애니메이션 없음) */
export function useMotionTransition(t: Transition): Transition {
  const reduce = useReducedMotion();
  return reduce ? INSTANT : t;
}

/** whileTap 등 제스처 애니메이션을 reduced-motion에서 끄기 위한 값 */
export function useAllowMotion(): boolean {
  return !useReducedMotion();
}
