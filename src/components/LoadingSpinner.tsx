"use client";

import { cn } from "@/lib/utils";

const LOGO_VIEWBOX = "0 0 1098 894";
const LOGO_ASPECT = 894 / 1098;

export type LoadingSpinnerProps = {
  /** `overlay`: 전체 화면 반투명 배경 + 중앙. `inline`: 주변 레이아웃 안에서만 표시 */
  mode?: "inline" | "overlay";
  /** SVG 너비(px). 높이는 로고 비율에 맞춰 자동 */
  size?: number;
  className?: string;
  overlayClassName?: string;
  /** 스크린 리더용 라벨 */
  "aria-label"?: string;
};

/**
 * AlphA 로고(원 + 가로선) 기반 로딩 인디케이터.
 * 빠르게 회전 후 멈춤을 ease-in-out으로 반복합니다.
 */
export function LoadingSpinner({
  mode = "inline",
  size = 56,
  className,
  overlayClassName,
  "aria-label": ariaLabel = "로딩 중",
}: LoadingSpinnerProps) {
  const height = Math.round(size * LOGO_ASPECT);

  const graphic = (
    <>
      <style>{`
        @keyframes alpha-loading-spin-burst {
          0% {
            transform: rotate(0deg);
          }
          34% {
            transform: rotate(360deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
        .alpha-loading-spinner-graphic {
          animation: alpha-loading-spin-burst 2.35s ease-in-out infinite;
          transform-origin: center center;
        }
      `}</style>
      <div
        className={cn("alpha-loading-spinner-graphic inline-flex shrink-0", className)}
        style={{ width: size, height }}
        role="status"
        aria-label={ariaLabel}
      >
        <svg
          className="size-full"
          viewBox={LOGO_VIEWBOX}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <circle cx="549.5" cy="447" r="434.5" stroke="#3498DB" strokeWidth="25" />
          <path
            d="M12.5 447L1085.5 447.061"
            stroke="#3498DB"
            strokeWidth="25"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </>
  );

  if (mode === "overlay") {
    return (
      <div
        className={cn(
          "fixed inset-0 z-[300] flex items-center justify-center bg-background/75 backdrop-blur-[2px] dark:bg-background/80",
          overlayClassName
        )}
        role="presentation"
      >
        {graphic}
      </div>
    );
  }

  return graphic;
}
