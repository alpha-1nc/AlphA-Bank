"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { APP_NAV_ITEMS } from "@/lib/app-nav";

const THEME_KEY = "alphabank-theme";

export default function BottomTabBar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
  }, []);

  if (pathname.startsWith("/select-profile")) {
    return null;
  }

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-[200] flex h-[60px] items-stretch border-t border-border/80 bg-card/95 backdrop-blur-xl md:hidden",
        "pb-[env(safe-area-inset-bottom,0px)]",
        "shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.35)]"
      )}
      aria-label="주요 메뉴"
    >
      <div className="flex min-w-0 flex-1 items-stretch">
        {APP_NAV_ITEMS.map(({ href, shortLabel, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] font-semibold leading-tight transition-colors select-none",
                "active:opacity-90",
                active
                  ? "bg-primary/15 text-primary dark:bg-primary/25"
                  : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden />
              <span className="truncate max-w-full">{shortLabel}</span>
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        className={cn(
          "flex w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-border/60 text-[10px] font-semibold text-muted-foreground transition-colors select-none",
          "active:opacity-90"
        )}
      >
        {isDark ? (
          <Sun className="h-5 w-5 shrink-0" aria-hidden />
        ) : (
          <Moon className="h-5 w-5 shrink-0" aria-hidden />
        )}
        <span className="truncate">테마</span>
      </button>
    </nav>
  );
}
