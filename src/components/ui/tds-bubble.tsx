import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * TDS Bubble API를 따르는 자체 구현 (말풍선).
 * blue는 나(accent, 꼬리 오른쪽), grey는 상대방(무채색, 꼬리 왼쪽).
 */

export type BubbleProps = HTMLAttributes<HTMLDivElement> & {
  background: "grey" | "blue";
  withTail?: boolean;
};

export function Bubble({ background, withTail = true, className, children, ...rest }: BubbleProps) {
  const isBlue = background === "blue";
  return (
    <div
      {...rest}
      className={cn(
        "t6 relative inline-block w-fit max-w-full rounded-[18px] px-3.5 py-2.5",
        isBlue ? "bg-primary text-primary-foreground" : "bg-divider text-foreground",
        className
      )}
    >
      {children}
      {withTail && (
        <svg
          aria-hidden
          width="9"
          height="14"
          viewBox="0 0 9 14"
          className={cn(
            "absolute bottom-0",
            isBlue ? "-right-[5px] text-primary" : "-left-[5px] -scale-x-100 text-divider"
          )}
        >
          <path d="M0 0v14h9C4.5 12.5 1.2 8.5 0 0z" fill="currentColor" />
        </svg>
      )}
    </div>
  );
}
