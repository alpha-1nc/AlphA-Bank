"use client";

import { usePathname } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { getNavItemForPathname } from "@/lib/app-nav";

type Props = {
  /** 세션 프로필 표시명 (예: JK, MY). 없으면 오른쪽 칸 비움 */
  profileLabel: string | null;
};

export default function MobileHeader({ profileLabel }: Props) {
  const pathname = usePathname();

  if (pathname.startsWith("/select-profile")) {
    return null;
  }

  const navItem = getNavItemForPathname(pathname);
  const pageTitle = navItem?.label ?? "AlphA Bank";
  const PageIcon = navItem?.icon ?? LayoutDashboard;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120] md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <header className="pointer-events-auto border-b border-border/80 bg-card/95 text-foreground backdrop-blur-md">
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

          <div className="relative z-[2] ml-auto flex w-16 shrink-0 items-center justify-center">
            {profileLabel ? (
              <span
                className="inline-flex h-10 min-w-10 max-w-[4.5rem] shrink-0 items-center justify-center rounded-full bg-primary/15 px-2.5 text-sm font-bold tabular-nums text-primary "
                aria-label={`현재 프로필 ${profileLabel}`}
              >
                {profileLabel}
              </span>
            ) : (
              <span className="inline-block h-10 w-10 shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
