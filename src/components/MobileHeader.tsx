"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
import { APP_NAV_ITEMS, getNavItemForPathname } from "@/lib/app-nav";

const THEME_KEY = "alphabank-theme";
const STAGGER_MS = 48;
/** `.mobile-nav-item-*` duration과 동기 */
const ANIM_MS = 420;

const TOTAL_ROWS = APP_NAV_ITEMS.length + 1;

type Props = {
  /** 세션 프로필 표시명 (예: JK, MY). 없으면 오른쪽 칸 비움 */
  profileLabel: string | null;
};

export default function MobileHeader({ profileLabel }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLElement>(null);
  const pendingAfterCloseRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    setOpen(false);
    setExiting(false);
  }, [pathname]);

  const closeWithAnimation = useCallback((onDone?: () => void) => {
    if (!open || exiting) return;
    pendingAfterCloseRef.current = onDone ?? null;
    setExiting(true);
  }, [open, exiting]);

  useEffect(() => {
    if (!exiting) return;
    const delay = (TOTAL_ROWS - 1) * STAGGER_MS + ANIM_MS;
    const id = window.setTimeout(() => {
      setOpen(false);
      setExiting(false);
      const fn = pendingAfterCloseRef.current;
      pendingAfterCloseRef.current = null;
      fn?.();
    }, delay);
    return () => clearTimeout(id);
  }, [exiting]);

  useEffect(() => {
    if (!open || exiting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeWithAnimation();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, exiting, closeWithAnimation]);

  useEffect(() => {
    if (!open || exiting) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (hamburgerRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      closeWithAnimation();
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [open, exiting, closeWithAnimation]);

  if (pathname.startsWith("/select-profile")) {
    return null;
  }

  function applyThemeToggle() {
    setIsDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      return next;
    });
  }

  function toggleMenu() {
    if (exiting) return;
    if (open) {
      closeWithAnimation();
    } else {
      setOpen(true);
    }
  }

  const navItem = getNavItemForPathname(pathname);
  const pageTitle = navItem?.label ?? "AlphA Bank";
  const PageIcon = navItem?.icon ?? LayoutDashboard;

  return (
    <div
      className="fixed inset-x-0 top-0 z-[120] md:hidden"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="relative z-[2]">
        <header className="pointer-events-auto border-b border-border/80 bg-card/95 text-foreground shadow-sm backdrop-blur-md">
          <div className="relative flex h-14 items-stretch">
            {/* 왼쪽: 햄버거 + 바로 아래 플로팅 메뉴 (콘텐츠 너비만) */}
            <div className="relative z-[3] flex w-14 shrink-0 items-center justify-center">
              <button
                ref={hamburgerRef}
                type="button"
                onClick={toggleMenu}
                className={cn(
                  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm",
                  "border-primary/40 bg-primary/12 text-primary",
                  "transition-colors active:scale-[0.98] touch-manipulation select-none",
                  "hover:bg-primary/18 hover:border-primary/50",
                  open && !exiting && "bg-primary/20 border-primary/55 ring-2 ring-primary/25"
                )}
                aria-expanded={open}
                aria-haspopup="true"
                aria-label={open && !exiting ? "메뉴 닫기" : "메뉴 열기"}
              >
                <Menu className="h-5 w-5" aria-hidden />
              </button>

              {open && (
                <nav
                  ref={menuRef}
                  className="absolute left-0 top-full z-[50] mt-1.5 flex w-max max-w-[min(90vw,18rem)] flex-col items-start gap-0.5 bg-transparent py-0"
                  aria-label="앱 메뉴"
                >
                  {APP_NAV_ITEMS.map(({ href, label, icon: Icon }, index) => {
                    const active = pathname === href;
                    const delayIn = index * STAGGER_MS;
                    const delayOut = (TOTAL_ROWS - 1 - index) * STAGGER_MS;
                    return (
                      <Link
                        key={href}
                        href={href}
                        onClick={(e) => {
                          e.preventDefault();
                          if (exiting) return;
                          closeWithAnimation(() => router.push(href));
                        }}
                        style={{
                          animationDelay: exiting ? `${delayOut}ms` : `${delayIn}ms`,
                        }}
                        className={cn(
                          "inline-flex max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium touch-manipulation select-none",
                          exiting ? "mobile-nav-item-stagger-out" : "mobile-nav-item-stagger",
                          active ? "text-primary" : "text-foreground/90"
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                          aria-hidden
                        />
                        <span className="whitespace-nowrap">{label}</span>
                      </Link>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() => {
                      if (exiting) return;
                      closeWithAnimation(() => applyThemeToggle());
                    }}
                    style={{
                      animationDelay: exiting
                        ? `${(TOTAL_ROWS - 1 - APP_NAV_ITEMS.length) * STAGGER_MS}ms`
                        : `${APP_NAV_ITEMS.length * STAGGER_MS}ms`,
                    }}
                    className={cn(
                      "inline-flex w-max max-w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm font-medium text-foreground/90 touch-manipulation select-none",
                      exiting ? "mobile-nav-item-stagger-out" : "mobile-nav-item-stagger"
                    )}
                    aria-label={isDark ? "라이트 모드" : "다크 모드"}
                  >
                    {isDark ? (
                      <Sun className="h-5 w-5 shrink-0 text-amber-500" aria-hidden />
                    ) : (
                      <Moon className="h-5 w-5 shrink-0 text-primary/80" aria-hidden />
                    )}
                    <span className="whitespace-nowrap">
                      {isDark ? "라이트 모드" : "다크 모드"}
                    </span>
                  </button>
                </nav>
              )}
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
      </div>
    </div>
  );
}
