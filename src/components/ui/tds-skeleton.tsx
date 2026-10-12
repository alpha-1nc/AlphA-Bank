"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { FADE, useAllowMotion, useMotionTransition } from "./tds-motion";

/**
 * TDS Skeleton API(height / pattern / custom / repeatLastItemCount / play / background)를 따르는 자체 구현.
 * 문서에 각 pattern의 구성이 없어 모듈 조합은 직접 정했다 (PATTERNS 참고).
 * 회색 블록 위로 밝은 띠가 흐른다. 동작 줄이기 설정이면 흐름 없이 정지.
 */

type Module = "list" | "title" | "subtitle" | "card" | "listWithIcon" | `spacer(${number})`;

export type SkeletonPattern =
  | "topList"
  | "topListWithIcon"
  | "amountTopList"
  | "amountTopListWithIcon"
  | "subtitleList"
  | "subtitleListWithIcon"
  | "listOnly"
  | "listWithIconOnly"
  | "cardOnly";

export type SkeletonProps = {
  height?: string | number;
  pattern?: SkeletonPattern;
  custom?: Module[];
  /** 마지막 모듈 반복 횟수. "infinite"면 30번 */
  repeatLastItemCount?: number | "infinite";
  play?: "show" | "hide";
  background?: "white" | "grey" | "greyOpacity100";
  style?: CSSProperties;
  className?: string;
};

/** pattern → 모듈 구성 (확정값) */
const PATTERNS: Record<SkeletonPattern, Module[]> = {
  topList: ["title", "spacer(8)", "list"],
  topListWithIcon: ["title", "spacer(8)", "listWithIcon"],
  amountTopList: ["subtitle", "title", "spacer(16)", "list"],
  amountTopListWithIcon: ["subtitle", "title", "spacer(16)", "listWithIcon"],
  subtitleList: ["subtitle", "spacer(8)", "list"],
  subtitleListWithIcon: ["subtitle", "spacer(8)", "listWithIcon"],
  listOnly: ["list"],
  listWithIconOnly: ["listWithIcon"],
  cardOnly: ["card"],
};

const BG: Record<NonNullable<SkeletonProps["background"]>, string> = {
  grey: "var(--adaptiveGrey100)",
  white: "rgba(255,255,255,0.18)",
  greyOpacity100: "var(--adaptiveGreyOpacity100)",
};

function Block({ className, color, flow }: { className: string; color: string; flow: boolean }) {
  return (
    <motion.span
      className={cn("block overflow-hidden", className)}
      style={{
        backgroundColor: color,
        backgroundImage: flow
          ? "linear-gradient(90deg, transparent 0%, color-mix(in oklab, var(--card) 45%, transparent) 50%, transparent 100%)"
          : undefined,
        backgroundSize: "200% 100%",
        backgroundRepeat: "no-repeat",
      }}
      animate={flow ? { backgroundPosition: ["150% 0", "-50% 0"] } : undefined}
      transition={flow ? { duration: 1.4, ease: "linear", repeat: Infinity } : undefined}
    />
  );
}

/** 모듈별 확정 수치 */
function renderModule(m: Module, key: string, color: string, flow: boolean): ReactNode {
  const spacer = /^spacer\((\d+)\)$/.exec(m);
  if (spacer) return <div key={key} style={{ height: Number(spacer[1]) }} />;
  switch (m) {
    case "title":
      return (
        <div key={key} className="py-2">
          <Block className="h-6 w-2/5 rounded-[8px]" color={color} flow={flow} />
        </div>
      );
    case "subtitle":
      return (
        <div key={key} className="py-1.5">
          <Block className="h-4 w-1/4 rounded-[6px]" color={color} flow={flow} />
        </div>
      );
    case "list":
      return (
        <div key={key} className="flex flex-col gap-2 py-3">
          <Block className="h-4 w-3/5 rounded-[6px]" color={color} flow={flow} />
          <Block className="h-3 w-2/5 rounded-[6px]" color={color} flow={flow} />
        </div>
      );
    case "listWithIcon":
      return (
        <div key={key} className="flex items-center gap-3 py-3">
          <Block className="h-10 w-10 shrink-0 rounded-[12px]" color={color} flow={flow} />
          <div className="flex flex-1 flex-col gap-2">
            <Block className="h-4 w-3/5 rounded-[6px]" color={color} flow={flow} />
            <Block className="h-3 w-2/5 rounded-[6px]" color={color} flow={flow} />
          </div>
        </div>
      );
    case "card":
      return (
        <div key={key} className="py-2">
          <Block className="h-[120px] w-full rounded-[16px]" color={color} flow={flow} />
        </div>
      );
    default:
      return null;
  }
}

export function Skeleton({
  height = "auto",
  pattern = "topList",
  custom,
  repeatLastItemCount = 3,
  play = "show",
  background = "grey",
  style,
  className,
}: SkeletonProps) {
  const allowMotion = useAllowMotion();
  const fade = useMotionTransition(FADE);
  const modules = custom ?? PATTERNS[pattern];
  const repeat = repeatLastItemCount === "infinite" ? 30 : Math.max(1, repeatLastItemCount);
  const last = modules[modules.length - 1];
  const list = [...modules.slice(0, -1), ...(last ? Array.from({ length: repeat }, () => last) : [])];
  const color = BG[background];
  const visible = play === "show";

  return (
    <motion.div
      aria-hidden={!visible}
      aria-busy={visible}
      className={cn("overflow-hidden", className)}
      style={{ height, ...style }}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={fade}
    >
      {list.map((m, i) => renderModule(m, `${m}-${i}`, color, allowMotion && visible))}
    </motion.div>
  );
}
