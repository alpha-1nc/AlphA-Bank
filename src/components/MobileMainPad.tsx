"use client";

import { cn } from "@/lib/utils";

export default function MobileMainPad({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden min-w-0",
        "mobile-main-pad",
        "pt-[calc(env(safe-area-inset-top,0px)+4rem)] md:pt-0"
      )}
    >
      {children}
    </main>
  );
}
