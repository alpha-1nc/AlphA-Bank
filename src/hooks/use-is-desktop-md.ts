"use client";

import { useLayoutEffect, useState } from "react";

const MD_QUERY = "(min-width: 768px)";

/**
 * Tailwind `md` 브레이크포인트와 동일. 첫 페인트 전 `useLayoutEffect`에서 보정해
 * 데스크톱에서 모바일용 네이티브 UI가 한 프레임 보이는 현상을 줄입니다.
 */
export function useIsDesktopMd(): boolean {
  const [desktop, setDesktop] = useState(false);

  useLayoutEffect(() => {
    const mq = window.matchMedia(MD_QUERY);
    const update = () => setDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return desktop;
}
