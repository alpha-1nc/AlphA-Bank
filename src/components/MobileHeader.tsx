"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { APP_NAV_ITEMS, getPageTitleForPathname } from "@/lib/app-nav";
import AnimatedLogoLink from "@/components/AnimatedLogoLink";

const THEME_KEY = "alphabank-theme";

type Props = {
  /** 세션 프로필 표시명 (예: JK, MY). 없으면 오른쪽 칸 비움 */
  profileLabel: string | null;
};

export default function MobileHeader({ profileLabel }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  if (pathname.startsWith("/select-profile")) {
    return null;
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    setOpen(false);
  }

  const pageTitle = getPageTitleForPathname(pathname);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120] md:hidden pointer-events-none"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <header className="pointer-events-auto border-b border-border/80 bg-card/95 text-foreground shadow-sm backdrop-blur-md">
        <div className="grid h-14 grid-cols-[minmax(5.25rem,auto)_1fr_2.75rem] items-center gap-1 px-2">
          <div className="flex min-w-0 justify-start items-center gap-0.5">
            <AnimatedLogoLink variant="sidebar" />
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-foreground shadow-sm",
                  "transition-colors active:scale-[0.98] touch-manipulation select-none",
                  "md:hover:bg-accent"
                )}
                aria-label="메뉴 열기"
              >
                <Menu className="h-5 w-5" />
              </SheetTrigger>
              <SheetContent
                side="left"
                overlayClassName="z-[125]"
                className="z-[130] w-[min(18rem,calc(100vw-1.5rem))] border-sidebar-border bg-sidebar p-0"
              >
                <SheetHeader className="flex h-14 flex-row items-center justify-start gap-0 pl-3 pr-4 py-0 border-b border-sidebar-border/60">
                  <SheetTitle className="flex items-center">
                    <Image
                      src="/logo-full.svg"
                      alt="AlphA Bank"
                      width={140}
                      height={44}
                      className="h-9 w-auto shrink-0"
                    />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-0.5 p-3 overflow-y-auto max-h-[calc(100vh-8rem)]" aria-label="앱 메뉴">
                  {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
                    const active = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors touch-manipulation select-none",
                          active
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground/80 md:hover:bg-sidebar-accent/60 md:hover:text-sidebar-foreground active:bg-sidebar-accent/40"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-sidebar-primary" : "text-current"
                          )}
                        />
                        {label}
                      </Link>
                    );
                  })}
                  <Separator className="my-2 bg-sidebar-border/60" />
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-sidebar-foreground/80 transition-colors md:hover:bg-sidebar-accent/60 active:bg-sidebar-accent/40 touch-manipulation select-none"
                    aria-label={isDark ? "라이트 모드" : "다크 모드"}
                  >
                    {isDark ? (
                      <Sun className="h-5 w-5 shrink-0" />
                    ) : (
                      <Moon className="h-5 w-5 shrink-0" />
                    )}
                    {isDark ? "라이트 모드" : "다크 모드"}
                  </button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>

          <p className="min-w-0 truncate text-center text-base font-bold tracking-tight text-foreground">
            {pageTitle}
          </p>

          <div className="flex justify-end">
            {profileLabel ? (
              <span
                className="inline-flex h-9 min-w-9 max-w-[4rem] shrink-0 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-bold tabular-nums text-primary"
                aria-label={`현재 프로필 ${profileLabel}`}
              >
                {profileLabel}
              </span>
            ) : (
              <span className="inline-block h-9 w-9 shrink-0" aria-hidden />
            )}
          </div>
        </div>
      </header>
    </div>
  );
}
