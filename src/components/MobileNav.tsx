"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LayoutDashboard, Landmark, Wallet, RefreshCw, Star, Settings, Moon, Sun } from "lucide-react";
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

const THEME_KEY = "alphabank-theme";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/asset", label: "자산현황", icon: Landmark },
  { href: "/budget", label: "월별 예산", icon: Wallet },
  { href: "/subscription", label: "구독 관리", icon: RefreshCw },
  { href: "/bucket", label: "머니 버킷리스트", icon: Star },
  { href: "/settings", label: "설정", icon: Settings },
];

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
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-foreground hover:bg-accent md:hidden"
        aria-label="메뉴 열기"
      >
        <Menu className="h-5 w-5" />
      </SheetTrigger>
      <SheetContent side="left" className="w-60 p-0 bg-sidebar">
        <SheetHeader className="flex h-14 flex-row items-center justify-start gap-0 pl-3 pr-4 py-0">
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
        <Separator />
        <nav className="flex flex-col gap-0.5 p-3">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-sidebar-primary" : "text-current"
                  )}
                />
                {label}
              </Link>
            );
          })}
          <Separator className="my-2" />
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground transition-colors w-full"
            aria-label={isDark ? "라이트 모드" : "다크 모드"}
          >
            {isDark ? (
              <Sun className="h-4 w-4 shrink-0" />
            ) : (
              <Moon className="h-4 w-4 shrink-0" />
            )}
            {isDark ? "라이트 모드" : "다크 모드"}
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
