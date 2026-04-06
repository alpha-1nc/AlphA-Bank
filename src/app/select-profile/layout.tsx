import type { ReactNode } from "react";

/** 프로필 선택 화면이 엣지/프록시 정적 캐시에 묶이지 않도록 */
export const dynamic = "force-dynamic";

export default function SelectProfileLayout({ children }: { children: ReactNode }) {
  return children;
}
