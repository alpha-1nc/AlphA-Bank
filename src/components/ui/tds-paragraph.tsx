import type { AnchorHTMLAttributes, CSSProperties, ElementType, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeColor, type BadgeSize, type BadgeVariant } from "./tds-badge";

/**
 * TDS Paragraph API를 따르는 자체 구현.
 * 하위: Paragraph.Text / Paragraph.Badge / Paragraph.Link / Paragraph.Icon
 */

export type Typography =
  | "t1" | "st1" | "st2" | "st3" | "t2" | "st4" | "st5" | "st6" | "t3" | "st7"
  | "t4" | "st8" | "st9" | "t5" | "st10" | "t6" | "st11" | "t7" | "st12" | "st13";
export type FontWeight = "regular" | "medium" | "semibold" | "bold";

/** 타이포 → 글자 크기(px) (globals.css의 TDS 스케일과 동일) */
export const TYPO_PX: Record<Typography, number> = {
  t1: 30, st1: 29, st2: 28, st3: 27, t2: 26, st4: 25, st5: 24, st6: 23, t3: 22, st7: 21,
  t4: 20, st8: 19, st9: 18, t5: 17, st10: 16, t6: 15, st11: 14, t7: 13, st12: 12, st13: 11,
};

export const WEIGHT_CLASS: Record<FontWeight, string> = {
  regular: "font-regular",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

export type ParagraphProps = {
  typography: Typography;
  display?: "block" | "inline";
  ellipsisAfterLines?: number;
  textAlign?: CSSProperties["textAlign"];
  fontWeight?: FontWeight;
  /** CSS 색 값 */
  color?: string;
  className?: string;
  style?: CSSProperties;
  id?: string;
  children?: ReactNode;
};

function ParagraphRoot({
  typography,
  display = "block",
  ellipsisAfterLines,
  textAlign,
  fontWeight = "regular",
  color,
  className,
  style,
  id,
  children,
}: ParagraphProps) {
  const As: ElementType = display === "inline" ? "span" : "p";
  const clamp =
    display === "block" && ellipsisAfterLines
      ? ({
          display: "-webkit-box",
          WebkitBoxOrient: "vertical",
          WebkitLineClamp: ellipsisAfterLines,
          overflow: "hidden",
        } as CSSProperties)
      : undefined;
  return (
    <As
      id={id}
      className={cn(typography, WEIGHT_CLASS[fontWeight], "whitespace-pre-line", className)}
      style={{ color, textAlign, ...clamp, ...style }}
    >
      {children}
    </As>
  );
}

/* ── Paragraph.Text ───────────────────────────────────────────────────── */
export type ParagraphTextProps = {
  children?: ReactNode;
  typography?: Typography;
  fontWeight?: FontWeight;
  color?: string;
  id?: string;
  style?: CSSProperties;
  className?: string;
};

function Text({ children, typography, fontWeight, color, id, style, className }: ParagraphTextProps) {
  return (
    <span
      id={id}
      className={cn(typography, fontWeight && WEIGHT_CLASS[fontWeight], className)}
      style={{ color, ...style }}
    >
      {children}
    </span>
  );
}

/* ── Paragraph.Badge ──────────────────────────────────────────────────── */
export type ParagraphBadgeProps = {
  color: BadgeColor;
  variant: BadgeVariant;
  typography?: Typography;
  children?: ReactNode;
  className?: string;
};

/** typography 글자 크기로 Badge 크기를 고른다 */
function badgeSizeFor(t: Typography | undefined): BadgeSize {
  const px = t ? TYPO_PX[t] : 15;
  if (px >= 17) return "large";
  if (px >= 15) return "medium";
  if (px >= 13) return "small";
  return "xsmall";
}

function ParagraphBadge({ color, variant, typography, children, className }: ParagraphBadgeProps) {
  return (
    <Badge color={color} variant={variant} size={badgeSizeFor(typography)} className={cn("mx-0.5 align-middle", className)}>
      {children}
    </Badge>
  );
}

/* ── Paragraph.Link ───────────────────────────────────────────────────── */
export type ParagraphLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "color" | "type"> & {
  type?: "underline" | "clear";
  typography?: Typography;
  fontWeight?: FontWeight;
  /** CSS 색 값. 기본 accent */
  color?: string;
  as?: ElementType;
};

function Link({
  type = "clear",
  typography,
  fontWeight,
  color = "var(--primary)",
  as: As = "a",
  className,
  style,
  ...rest
}: ParagraphLinkProps) {
  return (
    <As
      {...rest}
      className={cn(
        typography,
        fontWeight && WEIGHT_CLASS[fontWeight],
        type === "underline" && "underline underline-offset-[3px]",
        "cursor-pointer",
        className
      )}
      style={{ color, ...style }}
    />
  );
}

/* ── Paragraph.Icon ───────────────────────────────────────────────────── */
export type ParagraphIconProps = {
  icon: LucideIcon;
  /** 아이콘 높이 기준. 글자 크기의 1.2배 */
  typography?: Typography;
  color?: string;
  className?: string;
  "aria-label"?: string;
};

function Icon({ icon: I, typography, color, className, "aria-label": ariaLabel }: ParagraphIconProps) {
  const px = Math.round((typography ? TYPO_PX[typography] : 15) * 1.2);
  return (
    <I
      aria-hidden={ariaLabel ? undefined : true}
      aria-label={ariaLabel}
      className={cn("inline-block shrink-0 align-[-0.2em]", className)}
      style={{ width: px, height: px, color }}
    />
  );
}

export const Paragraph = Object.assign(ParagraphRoot, { Text, Badge: ParagraphBadge, Link, Icon });
