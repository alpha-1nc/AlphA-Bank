"use client";

import { useEffect, useRef, useState } from "react";

/** 오버레이 공용: 클라이언트 마운트 여부 (portal은 마운트 후에만) */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

/** 열린 동안 body 스크롤 잠금 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/** 열린 동안 Esc(웹의 뒤로가기 이벤트 대용) */
export function useEscape(active: boolean, handler: () => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ref.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);
}
