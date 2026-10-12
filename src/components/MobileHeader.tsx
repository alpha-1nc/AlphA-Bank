"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { getNavItemForPathname } from "@/lib/app-nav";

export default function MobileHeader() {
  const pathname = usePathname();

  const navItem = getNavItemForPathname(pathname);
  const pageTitle = navItem?.label ?? "AlphA Bank";
  const PageIcon = navItem?.icon ?? LayoutDashboard;

  return (
    <div
      className="sticky top-0 z-[120] border-b border-border/80 bg-card/95 backdrop-blur-md md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <header className="text-foreground">
        <div className="relative flex h-16 items-stretch">
          <div className="w-16 shrink-0" aria-hidden />

          <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-16">
            <div className="flex min-w-0 max-w-full items-center justify-center gap-3">
              <PageIcon
                className="h-[1.625rem] w-[1.625rem] shrink-0 text-primary"
                aria-hidden
              />
              <p className="min-w-0 truncate text-[1.0625rem] font-bold tracking-tight text-foreground">
                {pageTitle}
              </p>
            </div>
          </div>

          {/* 우측: 제목 중앙 정렬 유지용 빈 칸 */}
          <div className="ml-auto w-16 shrink-0" aria-hidden />
        </div>
      </header>
    </div>
  );
}
