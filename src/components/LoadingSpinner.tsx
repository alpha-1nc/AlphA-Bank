"use client";

import { createPortal } from "react-dom";
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

/** 한 사이클(초): 짧을수록 반복이 빨라짐 */
const SPIN_CYCLE_S = 1.05;
/** 키프레임 % — 이 지점까지 스냅 회전, 이후 멈춤 */
const SPIN_END_PERCENT = 28;
/** 한 번에 도는 각도(360=한 바퀴, 720=두 바퀴) */
const SPIN_DEG = 720;

/**
 * AlphA 로고(원 + 가로선) 기반 로딩 인디케이터.
 * 짧게 고속 회전 후 멈춤을 ease-in-out으로 반복합니다.
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
          ${SPIN_END_PERCENT}% {
            transform: rotate(${SPIN_DEG}deg);
          }
          100% {
            transform: rotate(${SPIN_DEG}deg);
          }
        }
        .alpha-loading-spinner-graphic {
          animation: alpha-loading-spin-burst ${SPIN_CYCLE_S}s cubic-bezier(0.42, 0, 0.58, 1) infinite;
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
    // 레이아웃 `<main class="overflow-y-auto">` 안에 두면 fixed 오버레이가 잘리거나
    // 전체 화면으로 안 보일 수 있어 body에 포털합니다 (예전 LogoEntranceAnimation과 동일).
    if (typeof document === "undefined") return null;
    return createPortal(
      <div
        className={cn(
          "fixed inset-0 z-[9999] flex items-center justify-center bg-background/75 backdrop-blur-[2px] dark:bg-background/80",
          overlayClassName
        )}
        role="presentation"
      >
        {graphic}
      </div>,
      document.body
    );
  }

  return graphic;
}
