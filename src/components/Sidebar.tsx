"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import {
  LayoutDashboard,
  Landmark,
  Wallet,
  RefreshCw,
  Star,
  Settings,
  Moon,
  Sun,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import AnimatedLogoLink from "@/components/AnimatedLogoLink";

type TooltipState = { label: string; x: number; y: number } | null;

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/asset", label: "자산현황", icon: Landmark },
  { href: "/budget", label: "월별 예산", icon: Wallet },
  { href: "/subscription", label: "구독 관리", icon: RefreshCw },
  { href: "/bucket", label: "머니 버킷리스트", icon: Star },
  { href: "/settings", label: "설정", icon: Settings },
];

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
    setTooltip({ label, x: rect.right + 12, y: rect.top + rect.height / 2 });
  }

  return (
    <aside className="flex h-full w-20 flex-col items-center border-r border-sky-100/30 dark:border-slate-700/50 bg-white/60 dark:bg-slate-900/70 backdrop-blur-2xl pt-6 pb-6 gap-5">
      {/* Logo - 클릭 시 시네마틱 트랜지션 후 홈으로 */}
      <div className="flex items-center justify-center shrink-0">
        <AnimatedLogoLink variant="sidebar" />
      </div>

      {/* Navigation Icons */}
      <nav className="flex flex-1 flex-col items-center gap-2 pt-2">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={(e) => showTooltip(e, label)}
              onMouseLeave={() => setTooltip(null)}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150",
                active
                  ? "bg-primary/20 dark:bg-primary/30 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
              )}
            >
              <Icon className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
            </Link>
          );
        })}

        {/* Dark Mode Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          onMouseEnter={(e) =>
            showTooltip(e, isDark ? "라이트 모드로 전환" : "다크 모드로 전환")
          }
          onMouseLeave={() => setTooltip(null)}
          className={cn(
            "group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150",
            "text-muted-foreground hover:bg-primary/10 dark:hover:bg-primary/20 hover:text-primary"
          )}
          aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
        >
          {isDark ? (
            <Sun className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
          ) : (
            <Moon className="h-5 w-5 shrink-0 transition-transform duration-200 ease-out group-hover:scale-110 group-hover:-translate-y-1" />
          )}
        </button>
      </nav>

      {/* Portal Tooltip - renders above all content */}
      {tooltip &&
        createPortal(
          <div
            className="fixed z-[99999] pointer-events-none -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white shadow-lg dark:bg-slate-200 dark:text-slate-900"
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
