"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
import { APP_NAV_ITEMS, getNavItemForPathname } from "@/lib/app-nav";

const THEME_KEY = "alphabank-theme";
const STAGGER_MS = 48;

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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

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

  const navItem = getNavItemForPathname(pathname);
  const pageTitle = navItem?.label ?? "AlphA Bank";
  const PageIcon = navItem?.icon ?? LayoutDashboard;

  const themeRowIndex = APP_NAV_ITEMS.length + 1;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120] md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      {/* 시각적 딤 없음 — 터치만 받아 메뉴 닫기 */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-[1] cursor-default border-0 bg-transparent p-0"
          aria-label="메뉴 닫기"
          tabIndex={-1}
          onClick={close}
        />
      )}

      <div className="relative z-[2]">
        <header className="pointer-events-auto border-b border-border/80 bg-card/95 text-foreground shadow-sm backdrop-blur-md">
          <div className="relative flex h-14 items-stretch">
            {/* 왼쪽: 햄버거 (브랜드 primary) */}
            <div className="relative z-[2] flex w-14 shrink-0 items-center justify-center">
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  "border-primary/40 bg-primary/12 text-primary",
                  "transition-colors active:scale-[0.98] touch-manipulation select-none",
                  "hover:bg-primary/18 hover:border-primary/50",
                  open && "bg-primary/20 border-primary/55 ring-2 ring-primary/25"
                )}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {/* 가운데: 아이콘 + 제목 */}
            <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center px-14">
              <div className="flex min-w-0 max-w-full items-center justify-center gap-2.5">
                <PageIcon
                  className="h-8 w-8 shrink-0 text-primary"
                  aria-hidden
                />
                <p className="min-w-0 truncate text-base font-bold tracking-tight text-foreground">
                  {pageTitle}
                </p>
              </div>
            </div>

            {/* 오른쪽: 프로필 이니셜 */}
            <div className="relative z-[2] ml-auto flex w-14 shrink-0 items-center justify-center">
              {profileLabel ? (
                <span
                  className="inline-flex h-9 min-w-9 max-w-[4rem] shrink-0 items-center justify-center rounded-full bg-primary/15 px-2 text-xs font-bold tabular-nums text-primary shadow-sm"
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

        {/* 헤더 바로 아래 플로팅 드롭다운 (슬라이드 패널 없음) */}
        {open && (
          <nav
            className={cn(
              "absolute left-2 right-2 top-full z-[3] mt-1 max-h-[min(72vh,calc(100dvh-5rem))] overflow-y-auto overflow-x-hidden",
              "rounded-2xl border border-border/80 bg-card/95 py-2 shadow-[0_16px_50px_-12px_rgba(15,23,42,0.18)] backdrop-blur-md",
              "dark:shadow-[0_16px_50px_-12px_rgba(0,0,0,0.55)]"
            )}
            aria-label="앱 메뉴"
          >
            {APP_NAV_ITEMS.map(({ href, label, icon: Icon }, index) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={close}
                  style={{ animationDelay: `${index * STAGGER_MS}ms` }}
                  className={cn(
                    "mobile-nav-item-stagger flex min-h-11 items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors touch-manipulation select-none",
                    active
                      ? "bg-primary/12 text-primary"
                      : "text-foreground/90 active:bg-accent/80"
                  )}
                >
                  <Icon
                    className={cn(
                      "h-5 w-5 shrink-0",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  {label}
                </Link>
              );
            })}

            <div
              className="mobile-nav-item-stagger mx-3 my-2 h-px bg-border/80"
              style={{
                animationDelay: `${APP_NAV_ITEMS.length * STAGGER_MS}ms`,
              }}
              aria-hidden
            />

            <button
              type="button"
              onClick={toggleTheme}
              style={{ animationDelay: `${themeRowIndex * STAGGER_MS}ms` }}
              className="mobile-nav-item-stagger flex min-h-11 w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-foreground/90 transition-colors active:bg-accent/80 touch-manipulation select-none"
              aria-label={isDark ? "라이트 모드" : "다크 모드"}
            >
              {isDark ? (
                <Sun className="h-5 w-5 shrink-0 text-amber-500" />
              ) : (
                <Moon className="h-5 w-5 shrink-0 text-primary/80" />
              )}
              {isDark ? "라이트 모드" : "다크 모드"}
            </button>
          </nav>
        )}
      </div>
    </div>
  );
}
