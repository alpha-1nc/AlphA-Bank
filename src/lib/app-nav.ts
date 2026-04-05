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
