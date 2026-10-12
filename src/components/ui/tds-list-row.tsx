"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { animate, useReducedMotion } from "motion/react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * TDS ListRow API를 따르는 자체 구현.
 * 하위: ListRow.Texts / ListRow.AssetIcon / ListRow.Loader
 * ref: shine(n) 가로지르는 반짝임, blink(n) 전체 깜빡임 (motion animate)
 */

export type ListRowVerticalPadding = "small" | "medium" | "large" | "xlarge";
export type ListRowHorizontalPadding = "small" | "medium";

export type ListRowProps = Omit<HTMLAttributes<HTMLDivElement>, "contents"> & {
  left?: ReactNode;
  contents?: ReactNode;
  right?: ReactNode;
  border?: "indented" | "none";
  disabled?: boolean;
  disabledStyle?: "type1" | "type2";
  verticalPadding?: ListRowVerticalPadding;
  horizontalPadding?: ListRowHorizontalPadding;
  leftAlignment?: "top" | "center";
  rightAlignment?: "top" | "center";
  withArrow?: boolean;
  withTouchEffect?: boolean;
  onClick?: () => void;
};

export type ListRowRef = {
  shine: (count?: number) => Promise<void>;
  blink: (count?: number) => Promise<void>;
};

/** 실측값 (px) */
const V_PAD: Record<ListRowVerticalPadding, number> = { small: 8, medium: 12, large: 16, xlarge: 24 };
const H_PAD: Record<ListRowHorizontalPadding, number> = { small: 20, medium: 24 };

const ListRowRoot = forwardRef<ListRowRef, ListRowProps>(function ListRow(
  {
    left,
    contents,
    right,
    border = "indented",
    disabled = false,
    disabledStyle = "type1",
    verticalPadding = "medium",
    horizontalPadding = "medium",
    leftAlignment = "center",
    rightAlignment = "center",
    withArrow = false,
    withTouchEffect = false,
    onClick,
    className,
    style,
    ...rest
  },
  ref
) {
  const shineRef = useRef<HTMLSpanElement>(null);
  const blinkRef = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useImperativeHandle(
    ref,
    () => ({
      async shine(count = 1) {
        const el = shineRef.current;
        if (!el || reduce) return;
        await animate(
          el,
          { x: ["-100%", "100%"], opacity: [1, 1] },
          { duration: 0.9, ease: "easeInOut", repeat: Math.max(0, count - 1) }
        );
        el.style.opacity = "0";
      },
      async blink(count = 1) {
        const el = blinkRef.current;
        if (!el || reduce) return;
        await animate(
          el,
          { opacity: [0, 1, 0] },
          { duration: 0.6, ease: "easeInOut", repeat: Math.max(0, count - 1) }
        );
      },
    }),
    [reduce]
  );

  const interactive = !!onClick && !disabled;
  const hPad = H_PAD[horizontalPadding];

  return (
    <div
      {...rest}
      role={interactive ? "button" : rest.role}
      tabIndex={interactive ? 0 : rest.tabIndex}
      aria-disabled={disabled || undefined}
      onClick={interactive ? onClick : undefined}
      onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
        rest.onKeyDown?.(e);
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "relative flex w-full items-center gap-3 overflow-hidden text-left outline-none",
        interactive && "cursor-pointer focus-visible:bg-divider/60",
        withTouchEffect && interactive && "transition-colors duration-150 active:bg-divider",
        disabled && (disabledStyle === "type1" ? "bg-divider/40" : "bg-divider"),
        className
      )}
      style={{ paddingTop: V_PAD[verticalPadding], paddingBottom: V_PAD[verticalPadding], paddingLeft: hPad, paddingRight: hPad, ...style }}
    >
      {left != null && (
        <div className={cn("flex shrink-0", leftAlignment === "top" ? "self-start" : "self-center", disabled && "opacity-40")}>
          {left}
        </div>
      )}
      <div className={cn("min-w-0 flex-1", disabled && "opacity-40")}>{contents}</div>
      {(right != null || withArrow) && (
        <div
          className={cn(
            "flex shrink-0 items-center gap-1",
            rightAlignment === "top" ? "self-start" : "self-center",
            disabled && "opacity-40"
          )}
        >
          {right}
          {withArrow && <ChevronRight className="h-5 w-5 text-fg-disabled" aria-hidden />}
        </div>
      )}
      {border === "indented" && (
        <span aria-hidden className="absolute bottom-0 right-0 h-px bg-divider" style={{ left: hPad }} />
      )}
      {/* shine / blink 오버레이 */}
      <span
        ref={shineRef}
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 w-full opacity-0"
        style={{
          background:
            "linear-gradient(100deg, transparent 20%, color-mix(in oklab, var(--primary) 18%, transparent) 50%, transparent 80%)",
        }}
      />
      <span ref={blinkRef} aria-hidden className="pointer-events-none absolute inset-0 bg-accent-soft opacity-0" />
    </div>
  );
});

/* ── ListRow.Texts ─────────────────────────────────────────────────────── */
export type ListRowTextsType = "1RowTypeA" | "2RowTypeA" | "3RowTypeA" | "Right1RowTypeA" | "Right2RowTypeA";

export type ListRowTextsProps = {
  type: ListRowTextsType;
  top?: ReactNode;
  middle?: ReactNode;
  bottom?: ReactNode;
  marginTop?: number;
  className?: string;
};

/** 확정 타이포: 주 텍스트 t5/semibold/foreground, 보조 t7/regular/fg-tertiary, 줄 간격 2px */
const MAIN = "t5 font-semibold text-foreground";
const SUB = "t7 font-regular text-fg-tertiary";

function Texts({ type, top, middle, bottom, marginTop, className }: ListRowTextsProps) {
  const isRight = type.startsWith("Right");
  const wrap = cn("flex min-w-0 flex-col gap-0.5", isRight ? "items-end text-right" : "items-start text-left", className);
  const style = marginTop != null ? { marginTop } : undefined;
  const line = (cls: string, node: ReactNode) => <div className={cn("max-w-full truncate", cls)}>{node}</div>;

  switch (type) {
    case "1RowTypeA":
    case "Right1RowTypeA":
      return <div className={wrap} style={style}>{line(MAIN, top)}</div>;
    case "2RowTypeA":
    case "Right2RowTypeA":
      return (
        <div className={wrap} style={style}>
          {line(MAIN, top)}
          {line(SUB, bottom)}
        </div>
      );
    case "3RowTypeA":
      return (
        <div className={wrap} style={style}>
          {line(SUB, top)}
          {line(MAIN, middle)}
          {line(SUB, bottom)}
        </div>
      );
  }
}

/* ── ListRow.AssetIcon ─────────────────────────────────────────────────── */
export type AssetIconShape = "original" | "squircle" | "card" | "circle-background" | "circle-masking";
export type AssetIconSize = "xsmall" | "small" | "medium";

export type ListRowAssetIconProps = {
  /** 로컬 경로 (예: /bank_logos/신한은행.svg) */
  src: string;
  alt?: string;
  shape?: AssetIconShape;
  size?: AssetIconSize;
  variant?: "fill" | "none";
  acc?: ReactNode;
  accPosition?: "bottom-right" | "top-right";
  accMasking?: "none" | "circle";
  className?: string;
};

/** TDS Asset 크기·스쿼클 경로 (TDS 내부 값) */
const ASSET_SIZE: Record<AssetIconSize, number> = { xsmall: 24, small: 30, medium: 36 };
const SQUIRCLE: Record<AssetIconSize, string> = {
  xsmall:
    'path("M0 11.568C0 2.376 2.376 0 11.568 0H12.432C21.624 0 24 2.376 24 11.568V12.432C24 21.624 21.624 24 12.432 24H11.568C2.376 24 0 21.624 0 12.432V11.568Z")',
  small:
    'path("M0 14.46C0 2.97 2.97 0 14.46 0H15.54C27.03 0 30 2.97 30 14.46V15.54C30 27.03 27.03 30 15.54 30H14.46C2.97 30 0 27.03 0 15.54V14.46Z")',
  medium:
    'path("M0 17.352C0 3.564 3.564 0 17.352 0H18.648C32.436 0 36 3.564 36 17.352V18.648C36 32.436 32.436 36 18.648 36H17.352C3.564 36 0 32.436 0 18.648V17.352Z")',
};

function AssetIcon({
  src,
  alt = "",
  shape = "squircle",
  size = "medium",
  variant = "none",
  acc,
  accPosition = "bottom-right",
  accMasking = "none",
  className,
}: ListRowAssetIconProps) {
  const px = ASSET_SIZE[size];
  const fill = variant === "fill";

  let frame: ReactNode;
  if (shape === "card") {
    const h = Math.round(px * 0.66);
    frame = (
      <span className={cn("flex items-center justify-center overflow-hidden rounded-[4px]", fill && "bg-divider")} style={{ width: px, height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </span>
    );
  } else if (shape === "circle-background") {
    frame = (
      <span className="flex items-center justify-center rounded-full bg-divider" style={{ width: px, height: px }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} style={{ width: px * 0.6, height: px * 0.6 }} className="object-contain" />
      </span>
    );
  } else {
    const clip =
      shape === "squircle" ? { clipPath: SQUIRCLE[size] } : shape === "circle-masking" ? { borderRadius: "9999px" } : undefined;
    frame = (
      <span
        className={cn("flex items-center justify-center overflow-hidden", fill && "bg-divider")}
        style={{ width: px, height: px, ...clip }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={shape === "circle-masking" ? "h-full w-full object-cover" : "h-full w-full object-contain"}
          style={fill && shape !== "circle-masking" ? { width: px * 0.7, height: px * 0.7 } : undefined}
        />
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {frame}
      {acc != null && (
        <span
          className={cn(
            "absolute flex items-center justify-center",
            accPosition === "bottom-right" ? "-bottom-1 -right-1" : "-right-1 -top-1",
            accMasking === "circle" && "rounded-full ring-2 ring-card"
          )}
          style={{ width: Math.round(px * 0.45), height: Math.round(px * 0.45) }}
        >
          {acc}
        </span>
      )}
    </span>
  );
}

/* ── ListRow.Loader ────────────────────────────────────────────────────── */
export type ListRowLoaderProps = {
  type?: "square" | "circle" | "bar";
  verticalPadding?: ListRowVerticalPadding;
  className?: string;
};

function Loader({ type = "square", verticalPadding = "medium", className }: ListRowLoaderProps) {
  const pulse = "animate-pulse motion-reduce:animate-none bg-divider";
  return (
    <div
      aria-busy="true"
      aria-label="불러오는 중"
      className={cn("flex w-full items-center gap-3", className)}
      style={{ paddingTop: V_PAD[verticalPadding], paddingBottom: V_PAD[verticalPadding], paddingLeft: H_PAD.medium, paddingRight: H_PAD.medium }}
    >
      {type !== "bar" && (
        <span className={cn("h-9 w-9 shrink-0", type === "circle" ? "rounded-full" : "rounded-[10px]", pulse)} />
      )}
      <div className="flex flex-1 flex-col gap-2">
        <span className={cn("h-4 w-1/2 rounded-[6px]", pulse)} />
        <span className={cn("h-3 w-1/3 rounded-[6px]", pulse)} />
      </div>
    </div>
  );
}

export const ListRow = Object.assign(ListRowRoot, { Texts, AssetIcon, Loader });
