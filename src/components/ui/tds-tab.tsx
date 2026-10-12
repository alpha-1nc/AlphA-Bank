"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS Tab API를 따르는 자체 구현.
 * 선택 탭 아래 밑줄이 layoutId로 미끄러진다 (SPRING.slide).
 * fluid=false: 같은 폭 분할(4개 이하 권장) / fluid=true: 글자 폭 + 가로 스크롤.
 */

export type TabProps = {
  children: ReactNode;
  onChange: (index: number, key?: string | number) => void;
  size?: "large" | "small";
  fluid?: boolean;
  /** 아이템 사이 간격(px) */
  itemGap?: number;
  ariaLabel?: string;
  className?: string;
};

export type TabItemProps = {
  selected: boolean;
  redBean?: boolean;
  children?: ReactNode;
  className?: string;
};

type InjectedProps = {
  __onSelect?: () => void;
  __layoutId?: string;
  __size?: "large" | "small";
  __fluid?: boolean;
};

/** 확정 수치: large 높이 48·t5 / small 높이 40·t6, 밑줄 2px foreground */
const SIZE = {
  large: "h-12 t5",
  small: "h-10 t6",
} as const;

function TabItem({
  selected,
  redBean = false,
  children,
  className,
  __onSelect,
  __layoutId,
  __size = "large",
  __fluid = false,
}: TabItemProps & InjectedProps) {
  const slide = useMotionTransition(SPRING.slide);
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={__onSelect}
      className={cn(
        "relative flex shrink-0 items-center justify-center whitespace-nowrap transition-colors duration-150",
        SIZE[__size],
        __fluid ? "px-2" : "min-w-0 flex-1 px-1",
        selected ? "font-semibold text-foreground" : "font-medium text-fg-tertiary",
        className
      )}
    >
      <span className="relative">
        {children}
        {redBean && (
          <span
            aria-label="새 소식"
            className="absolute -right-2 top-0.5 h-[5px] w-[5px] rounded-full bg-negative"
          />
        )}
      </span>
      {selected && (
        <motion.span
          layoutId={__layoutId}
          transition={slide}
          className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-foreground"
        />
      )}
    </button>
  );
}

function TabRoot({
  children,
  onChange,
  size = "large",
  fluid = false,
  itemGap,
  ariaLabel,
  className,
}: TabProps) {
  const layoutId = `tds-tab-${useId()}`;
  let index = -1;
  const items = Children.map(children, (child) => {
    if (!isValidElement(child)) return child;
    index += 1;
    const i = index;
    const key = child.key ?? undefined;
    return cloneElement(child as ReactElement<TabItemProps & InjectedProps>, {
      __onSelect: () => onChange(i, key === undefined ? undefined : key),
      __layoutId: layoutId,
      __size: size,
      __fluid: fluid,
    });
  });

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "relative flex w-full border-b border-divider",
        fluid && "overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      style={itemGap != null ? { columnGap: itemGap } : undefined}
    >
      {items}
    </div>
  );
}

export const Tab = Object.assign(TabRoot, { Item: TabItem });
