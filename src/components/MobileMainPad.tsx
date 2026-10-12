"use client";

import { cn } from "@/lib/utils";

export default function MobileMainPad({ children }: { children: React.ReactNode }) {
  return (
    <main
      className={cn(
        "flex-1 min-w-0",
        "mobile-main-pad"
      )}
    >
      {children}
    </main>
  );
}
