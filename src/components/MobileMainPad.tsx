"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export default function MobileMainPad({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showTabBar = !pathname.startsWith("/select-profile");

  return (
    <main
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden min-w-0",
        showTabBar && "pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0"
      )}
    >
      {children}
    </main>
  );
}
