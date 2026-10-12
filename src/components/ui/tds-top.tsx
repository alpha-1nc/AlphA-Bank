"use client";

import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge, type BadgeColor, type BadgeVariant } from "./tds-badge";
import { Button, type ButtonProps } from "./tds-button";
import { Paragraph, WEIGHT_CLASS, type FontWeight, type ParagraphProps, type Typography } from "./tds-paragraph";
import { TextButton, type TextButtonProps, type TextButtonSize } from "./tds-text-button";

/**
 * TDS Top API를 따르는 자체 구현 (화면 상단 제목 영역).
 * 구조: upper → (subtitleTop · title · subtitleBottom | right) → lower, 좌우 여백 24
 */

export type TopProps = {
  title: ReactNode;
  upperGap?: number;
  lowerGap?: number;
  upper?: ReactNode;
  lower?: ReactNode;
  subtitleTop?: ReactNode;
  subtitleBottom?: ReactNode;
  right?: ReactNode;
  rightVerticalAlign?: "center" | "end";
  className?: string;
};

const GREY800 = "var(--adaptiveGrey800)";
const GREY700 = "var(--adaptiveGrey700)";

function TopRoot({
  title,
  upperGap = 24,
  lowerGap = 24,
  upper,
  lower,
  subtitleTop,
  subtitleBottom,
  right,
  rightVerticalAlign = "center",
  className,
}: TopProps) {
  const titleNode = typeof title === "string" ? <TitleParagraph>{title}</TitleParagraph> : title;
  const subTop = typeof subtitleTop === "string" ? <SubtitleParagraph>{subtitleTop}</SubtitleParagraph> : subtitleTop;
  const subBottom =
    typeof subtitleBottom === "string" ? <SubtitleParagraph>{subtitleBottom}</SubtitleParagraph> : subtitleBottom;

  return (
    <section className={cn("w-full px-6", className)} style={{ paddingTop: upperGap, paddingBottom: lowerGap }}>
      {upper != null && <div className="mb-3">{upper}</div>}
      <div className={cn("flex gap-3", rightVerticalAlign === "end" ? "items-end" : "items-center")}>
        <div className="flex min-w-0 flex-1 flex-col">
          {subTop != null && <div className="mb-1">{subTop}</div>}
          {titleNode}
          {subBottom != null && <div className="mt-1">{subBottom}</div>}
        </div>
        {right != null && <div className="shrink-0">{right}</div>}
      </div>
      {lower != null && <div className="mt-4">{lower}</div>}
    </section>
  );
}

/* ── 제목 ─────────────────────────────────────────────────────────────── */
type TitleSize = 22 | 28;
const TITLE_TYPO: Record<TitleSize, Typography> = { 22: "t3", 28: "st2" };

export type TopTitleParagraphProps = Omit<ParagraphProps, "typography"> & {
  size?: TitleSize;
  typography?: Typography;
};

function TitleParagraph({ size = 22, color = GREY800, typography, fontWeight = "bold", ...rest }: TopTitleParagraphProps) {
  return <Paragraph {...rest} typography={typography ?? TITLE_TYPO[size]} color={color} fontWeight={fontWeight} />;
}

export type TopTitleTextButtonProps = Omit<TextButtonProps, "size" | "color"> & {
  size?: TextButtonSize;
  color?: string;
};

function TitleTextButton({ size = "xlarge", color = GREY800, style, ...rest }: TopTitleTextButtonProps) {
  return <TextButton {...rest} size={size} style={{ color, ...style }} />;
}

export type TopSelectorProps = {
  children?: ReactNode;
  onClick?: () => void;
  color?: string;
  typography?: Typography;
  fontWeight?: FontWeight;
  className?: string;
  "aria-label"?: string;
};

function Selector({
  children,
  onClick,
  color,
  typography,
  fontWeight,
  className,
  "aria-label": ariaLabel,
}: TopSelectorProps & { color: string; typography: Typography; fontWeight: FontWeight }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-left transition-opacity active:opacity-60",
        typography,
        WEIGHT_CLASS[fontWeight],
        className
      )}
      style={{ color }}
    >
      <span className="truncate">{children}</span>
      <ChevronDown aria-hidden className="h-[1em] w-[1em] shrink-0 opacity-60" />
    </button>
  );
}

function TitleSelector({
  size = 22,
  color = GREY800,
  typography,
  fontWeight = "bold",
  ...rest
}: TopSelectorProps & { size?: TitleSize }) {
  return <Selector {...rest} color={color} typography={typography ?? TITLE_TYPO[size]} fontWeight={fontWeight} />;
}

/* ── 부제목 ───────────────────────────────────────────────────────────── */
type SubtitleSize = 13 | 15 | 17;
const SUB_TYPO: Record<SubtitleSize, Typography> = { 13: "t7", 15: "t6", 17: "t5" };
const SUB_WEIGHT: Record<SubtitleSize, FontWeight> = { 13: "regular", 15: "regular", 17: "medium" };

export type TopSubtitleParagraphProps = Omit<ParagraphProps, "typography"> & {
  size?: SubtitleSize;
  typography?: Typography;
};

function SubtitleParagraph({ size = 17, color = GREY700, typography, fontWeight, ...rest }: TopSubtitleParagraphProps) {
  return (
    <Paragraph
      {...rest}
      typography={typography ?? SUB_TYPO[size]}
      color={color}
      fontWeight={fontWeight ?? SUB_WEIGHT[size]}
    />
  );
}

function SubtitleTextButton({
  size = "medium",
  variant = "arrow",
  color = GREY700,
  style,
  ...rest
}: TopTitleTextButtonProps) {
  return <TextButton {...rest} size={size} variant={variant} style={{ color, ...style }} />;
}

function SubtitleSelector({
  size = 17,
  color = GREY700,
  typography,
  fontWeight,
  ...rest
}: TopSelectorProps & { size?: SubtitleSize }) {
  return (
    <Selector
      {...rest}
      color={color}
      typography={typography ?? SUB_TYPO[size]}
      fontWeight={fontWeight ?? SUB_WEIGHT[size]}
    />
  );
}

export type TopSubtitleBadge = { text: ReactNode; color: BadgeColor; variant: BadgeVariant };

function SubtitleBadges({ badges, className }: { badges: TopSubtitleBadge[]; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {badges.map((b, i) => (
        <Badge key={i} color={b.color} variant={b.variant} size="small">
          {b.text}
        </Badge>
      ))}
    </div>
  );
}

/* ── 버튼 ─────────────────────────────────────────────────────────────── */
function LowerButton(props: ButtonProps) {
  return <Button size="small" {...(props as object)} />;
}

function LowerCTAButton(props: ButtonProps) {
  return <Button size="large" display="block" {...(props as object)} />;
}

function LowerCTA({ leftButton, rightButton }: { type: "2-button"; leftButton: ReactNode; rightButton: ReactNode }) {
  return (
    <div className="flex gap-2 [&>*]:min-w-0 [&>*]:flex-1">
      {leftButton}
      {rightButton}
    </div>
  );
}

function RightButton(props: ButtonProps) {
  return <Button size="medium" {...(props as object)} />;
}

/* ── 에셋 영역 (토스 Asset 대신 아무 ReactNode) ───────────────────────── */
function UpperAssetContent({ content }: { content: ReactNode }) {
  return <div className="flex">{content}</div>;
}

function RightAssetContent({ content }: { content: ReactNode }) {
  return <div className="flex items-center">{content}</div>;
}

export const Top = Object.assign(TopRoot, {
  TitleParagraph,
  TitleTextButton,
  TitleSelector,
  SubtitleParagraph,
  SubtitleTextButton,
  SubtitleSelector,
  SubtitleBadges,
  LowerButton,
  LowerCTA,
  LowerCTAButton,
  RightButton,
  UpperAssetContent,
  RightAssetContent,
});
