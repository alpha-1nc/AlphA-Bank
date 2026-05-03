"use client";

import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Serwist } from "@serwist/window";

/**
 * 빌드로 생성되는 `/sw.js` 등록.
 * `@serwist/next/react`의 SerwistProvider는 React 19 컴파일러 런타임을 쓰므로 React 18에서는 사용하지 않음.
 */
export function AppSerwistProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (process.env.NODE_ENV === "development") return;
    if (!("serviceWorker" in navigator)) return;

    try {
      if (!(window.serwist instanceof Serwist)) {
        window.serwist = new Serwist("/sw.js", {
          scope: "/",
          type: "module",
        });
      }
      void window.serwist.register();
    } catch {
      /* 일부 브라우저/비보안 출처에서는 등록 실패 가능 */
    }
  }, []);

  return children;
}
