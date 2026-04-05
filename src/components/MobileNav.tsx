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
import { APP_NAV_ITEMS } from "@/lib/app-nav";

const THEME_KEY = "alphabank-theme";

export default function MobileNav() {
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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        className={cn(
          "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card/95 text-foreground shadow-sm backdrop-blur-md",
          "transition-colors md:hidden",
          "active:scale-[0.98] touch-manipulation select-none",
          "md:hover:bg-accent"
        )}
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(18rem,calc(100vw-1.5rem))] p-0 bg-sidebar border-sidebar-border">
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
  );
}
