"use client";

import { useEffect, useRef, useState } from "react";

/** 오버레이 공용: 클라이언트 마운트 여부 (portal은 마운트 후에만) */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

let lockCount = 0;
let lockedY = 0;

/**
 * 열린 동안 body 스크롤 잠금 (iOS 는 body overflow:hidden 으로 못 막아서 position:fixed + top 보정).
 * 중첩 오버레이는 카운트로 관리하고, 마지막 하나가 닫힐 때 원래 위치로 복원한다.
 */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const body = document.body;
    if (lockCount++ === 0) {
      lockedY = window.scrollY;
      body.style.position = "fixed";
      body.style.top = `-${lockedY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
    }
    return () => {
      if (--lockCount > 0) return;
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      window.scrollTo(0, lockedY);
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
