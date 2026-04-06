import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Landmark,
  Wallet,
  Briefcase,
  RefreshCw,
  Star,
  Settings,
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  /** 하단 탭바 등 좁은 폭용 짧은 라벨 */
  shortLabel: string;
  icon: LucideIcon;
};

export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { href: "/", label: "대시보드", shortLabel: "홈", icon: LayoutDashboard },
  { href: "/asset", label: "자산현황", shortLabel: "자산", icon: Landmark },
  { href: "/budget", label: "월별 예산", shortLabel: "예산", icon: Wallet },
  { href: "/work", label: "급여 계산기", shortLabel: "급여", icon: Briefcase },
  { href: "/subscription", label: "구독 관리", shortLabel: "구독", icon: RefreshCw },
  { href: "/bucket", label: "머니 버킷리스트", shortLabel: "버킷", icon: Star },
  { href: "/settings", label: "설정", shortLabel: "설정", icon: Settings },
];

/** 현재 경로에 해당하는 앱 메뉴 항목 (아이콘·라벨). 매칭 없으면 null */
export function getNavItemForPathname(pathname: string): AppNavItem | null {
  const normalized = pathname.split("?")[0] || "/";
  for (const item of APP_NAV_ITEMS) {
    if (item.href === "/") {
      if (normalized === "/") return item;
      continue;
    }
    if (normalized === item.href || normalized.startsWith(`${item.href}/`)) {
      return item;
    }
  }
  return null;
}

/** 모바일 상단바 등에 표시할 현재 페이지명 (사이드바 메뉴 라벨과 동일) */
export function getPageTitleForPathname(pathname: string): string {
  return getNavItemForPathname(pathname)?.label ?? "AlphA Bank";
}
