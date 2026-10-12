"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Menu, Moon, Sun } from "lucide-react";
import { BottomSheet, ListRow, Switch } from "@/components/ui";
import { SPRING, useAllowMotion } from "@/components/ui/tds-motion";
import { APP_NAV_ITEMS } from "@/lib/app-nav";
import { cn } from "@/lib/utils";

const THEME_KEY = "alphabank-theme";

/** 탭바 고정 칸 (이동 경로는 APP_NAV_ITEMS 그대로) */
const TAB_HREFS = ["/", "/budget", "/work"];
const TAB_ITEMS = APP_NAV_ITEMS.filter((i) => TAB_HREFS.includes(i.href));
/** "전체" 시트에 들어가는 나머지 항목 */
const SHEET_ITEMS = APP_NAV_ITEMS.filter((i) => !TAB_HREFS.includes(i.href));

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function TabContent({ icon: Icon, label, active }: { icon: typeof Menu; label: string; active: boolean }) {
  const allowMotion = useAllowMotion();
  return (
    <motion.span
      className={cn(
        "flex h-full w-full min-w-0 flex-col items-center justify-center gap-[2px] px-1 transition-colors duration-150 ease-out motion-reduce:transition-none",
        active ? "text-primary" : "text-fg-tertiary"
      )}
      whileTap={allowMotion ? { scale: 0.92 } : undefined}
      transition={SPRING.press}
    >
      <Icon
        className={cn(
          "h-6 w-6 shrink-0 transition-[transform,stroke-width] duration-150 ease-out motion-reduce:transition-none",
          active ? "scale-105" : "scale-100"
        )}
        strokeWidth={active ? 2.5 : 1.8}
        aria-hidden
      />
      <span
        className={cn(
          "st13 w-full truncate text-center whitespace-nowrap transition-[font-weight] duration-150 ease-out motion-reduce:transition-none",
          active ? "font-semibold" : "font-medium"
        )}
      >
        {label}
      </span>
    </motion.span>
  );
}

/** 탭 한 칸: 높이 56 (safe-area 여백은 nav 의 padding-bottom 이 따로 만든다) */
const TAB_CELL =
  "flex h-14 flex-1 min-w-0 select-none touch-manipulation [-webkit-tap-highlight-color:transparent]";

/** nav: 56px 탭 줄 아래 홈 인디케이터용 빈 띠(padding-bottom)는 globals.css 의 .mobile-tabbar 가 만든다 */
const NAV_CLASS =
  "mobile-tabbar fixed inset-x-0 bottom-0 z-[110] border-t border-border md:hidden";

/** Suspense fallback: 같은 높이의 빈 탭바 */
export function MobileTabBarFallback() {
  return (
    <nav className={NAV_CLASS} aria-hidden>
      <div className="h-14" />
    </nav>
  );
}

/** 모바일(md 미만) 하단 탭바 + "전체" 시트 */
export default function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) as "light" | "dark" | null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const dark = stored === "dark" || (!stored && prefersDark);
    setIsDark(dark);
    document.documentElement.classList.toggle("dark", dark);
  }, []);

  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(THEME_KEY, next ? "dark" : "light");
  }

  function handleTabClick(e: React.MouseEvent, href: string) {
    // 탭 루트 경로에 쿼리 없이 정확히 있을 때만 이동을 막고 맨 위로 스크롤
    if (pathname !== href || searchParams.toString() !== "") return;
    e.preventDefault();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  const moreActive = SHEET_ITEMS.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className={NAV_CLASS} aria-label="주 메뉴">
        <div className="flex h-14">
          {TAB_ITEMS.map(({ href, label, icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                prefetch
                aria-current={active ? "page" : undefined}
                onPointerEnter={() => router.prefetch(href)}
                onPointerDown={() => router.prefetch(href)}
                onClick={(e) => handleTabClick(e, href)}
                className={TAB_CELL}
              >
                <TabContent icon={icon} label={label} active={active} />
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            className={TAB_CELL}
            aria-haspopup="dialog"
            aria-expanded={sheetOpen}
          >
            <TabContent icon={Menu} label="전체" active={moreActive} />
          </button>
        </div>
      </nav>

      <BottomSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        header={<BottomSheet.Header>전체</BottomSheet.Header>}
      >
        <div>
          {SHEET_ITEMS.map(({ href, label, icon: Icon }) => (
            <ListRow
              key={href}
              withTouchEffect
              border="none"
              onClick={() => {
                setSheetOpen(false);
                router.push(href);
              }}
              left={<Icon className="h-6 w-6 text-fg-secondary" aria-hidden />}
              contents={<ListRow.Texts type="1RowTypeA" top={label} />}
            />
          ))}
          <div className="mx-6 my-2 h-px bg-divider" aria-hidden />
          <ListRow
            withTouchEffect
            border="none"
            onClick={toggleTheme}
            left={
              isDark ? (
                <Sun className="h-6 w-6 text-fg-secondary" aria-hidden />
              ) : (
                <Moon className="h-6 w-6 text-fg-secondary" aria-hidden />
              )
            }
            contents={<ListRow.Texts type="1RowTypeA" top="다크 모드" />}
            right={
              <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                <Switch
                  checked={isDark}
                  onCheckedChange={toggleTheme}
                  aria-label="다크 모드"
                  onClick={(e) => e.stopPropagation()}
                />
              </span>
            }
          />
        </div>
      </BottomSheet>
    </>
  );
}
