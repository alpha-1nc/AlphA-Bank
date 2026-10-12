import { cn } from "@/lib/utils";

/**
 * TDS Border API를 따르는 자체 구현.
 * full: 전체 폭 1px 선 / padding24: 좌우 24px 들인 1px 선 / height16: 높이 16의 배경색 블록(구간 구분)
 */

export type BorderProps = {
  variant?: "full" | "padding24" | "height16";
  /** variant="height16"일 때 높이(px) 바꾸기 */
  height?: number;
  className?: string;
};

export function Border({ variant = "full", height, className }: BorderProps) {
  if (variant === "height16") {
    return <div role="separator" aria-hidden className={cn("w-full bg-background", className)} style={{ height: height ?? 16 }} />;
  }
  return (
    <div
      role="separator"
      aria-hidden
      className={cn("h-px bg-divider", variant === "padding24" ? "mx-6" : "w-full", className)}
    />
  );
}
