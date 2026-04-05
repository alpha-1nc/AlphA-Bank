"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useLogoEntranceAnimation } from "@/components/LogoEntranceAnimation";

type AnimatedLogoLinkProps = {
  /** "header" = 풀 로고 (logo-full), "sidebar" = 아이콘 로고 (logo-alpha) */
  variant?: "header" | "sidebar";
};

export default function AnimatedLogoLink({ variant = "header" }: AnimatedLogoLinkProps) {
  const router = useRouter();
  const { start, overlay, isAnimating } = useLogoEntranceAnimation();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (isAnimating) return;
      start(() => {
        router.push("/");
      });
    },
    [isAnimating, router, start]
  );

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={
          variant === "sidebar"
            ? "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg -m-1 p-1 hover:opacity-80 transition-opacity flex items-center cursor-pointer"
            : "flex items-center cursor-pointer"
        }
        aria-label="홈으로 이동"
      >
        <Image
          src={variant === "sidebar" ? "/logo-alpha.svg" : "/logo-full.svg"}
          alt="AlphA Bank"
          width={variant === "sidebar" ? 56 : 140}
          height={variant === "sidebar" ? 36 : 42}
          priority
          className={
            variant === "sidebar"
              ? "h-9 w-auto object-contain pointer-events-none"
              : "h-9 w-auto"
          }
        />
      </button>
      {overlay}
    </>
  );
}
