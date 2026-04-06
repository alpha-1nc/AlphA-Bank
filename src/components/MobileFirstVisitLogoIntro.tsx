"use client";

import { useLayoutEffect, useRef } from "react";
import { useLogoEntranceAnimation } from "@/components/LogoEntranceAnimation";

/** 브라우저 탭당 1회 — 모바일 첫 진입 시 로고 애니메이션 자동 재생 */
const SESSION_KEY = "alphabank-mobile-logo-intro-done";

function isMobileViewport(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
}

/**
 * 모바일에서 해당 탭으로 처음 들어올 때만 풀스크린 로고 입장 애니메이션을 한 번 재생합니다.
 * 재생이 끝나면 sessionStorage에 표시해 같은 탭에서는 다시 띄우지 않습니다.
 */
export default function MobileFirstVisitLogoIntro() {
  const { start, overlay } = useLogoEntranceAnimation();
  const ranRef = useRef(false);

  useLayoutEffect(() => {
    if (ranRef.current) return;
    if (!isMobileViewport()) return;
    try {
      if (sessionStorage.getItem(SESSION_KEY)) return;
    } catch {
      return;
    }

    ranRef.current = true;
    start(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
    });
  }, [start]);

  return <>{overlay}</>;
}
