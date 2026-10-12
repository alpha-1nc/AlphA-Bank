"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MobileMainPad({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showMobileHeaderOffset = !pathname.startsWith("/select-profile");

  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden min-w-0",
        showMobileHeaderOffset
          ? "pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))] md:pb-0"
          : "pb-[env(safe-area-inset-bottom,0px)] md:pb-0",
        showMobileHeaderOffset &&
          "pt-[calc(env(safe-area-inset-top,0px)+4rem)] md:pt-0"
      )}
    >
      {children}
    </main>
  );
}
