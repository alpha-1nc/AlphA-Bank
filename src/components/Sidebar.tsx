"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import AnimatedLogoLink from "@/components/AnimatedLogoLink";
import { APP_NAV_ITEMS } from "@/lib/app-nav";

type TooltipState = { label: string; x: number; y: number } | null;

const THEME_KEY = "alphabank-theme";

export default function Sidebar() {
  const pathname = usePathname();
  const [isDark, setIsDark] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipState>(null);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  function showTooltip(e: React.MouseEvent<HTMLElement>, label: string) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ label, x: rect.right + 20, y: rect.top + rect.height / 2 });
  }

  return (
    <aside className="flex h-full w-20 flex-col items-center bg-card pt-6 pb-6 gap-5">
      {/* Logo - 클릭 시 시네마틱 트랜지션 후 홈으로 */}
      <div className="flex items-center justify-center shrink-0">
        <AnimatedLogoLink variant="sidebar" />
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-1 flex-col items-center gap-2 pt-2">
        {APP_NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={(e) => showTooltip(e, label)}
              onMouseLeave={() => setTooltip(null)}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-[12px] transition-all duration-150",
                active ? "bg-accent-soft text-primary" : "text-fg-disabled hover:text-fg-secondary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
            </Link>
          );
        })}
      </nav>

      {/* Dark Mode Toggle — 메뉴와 구분선으로 분리, 최하단 고정 */}
      <div className="flex flex-col items-center gap-3 shrink-0">
        <div className="h-px w-8 bg-divider" aria-hidden />
        <button
          type="button"
          onClick={toggleTheme}
          onMouseEnter={(e) =>
            showTooltip(e, isDark ? "라이트 모드로 전환" : "다크 모드로 전환")
          }
          onMouseLeave={() => setTooltip(null)}
          className={cn(
            "group relative flex h-11 w-11 items-center justify-center rounded-[12px] transition-all duration-150",
            "text-fg-disabled hover:text-fg-secondary"
          )}
          aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
          ) : (
            <Moon className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
          )}
        </button>
      </div>

      {/* Portal Tooltip - renders above all content */}
      {tooltip &&
        createPortal(
          <div
            className="t8 fixed z-[2147483647] pointer-events-none -translate-y-1/2 whitespace-nowrap rounded-pill bg-foreground px-3 py-2 font-medium text-card"
            style={{
              left: tooltip.x,
              top: tooltip.y,
            }}
          >
            {tooltip.label}
          </div>,
          document.body
        )}
    </aside>
  );
}
