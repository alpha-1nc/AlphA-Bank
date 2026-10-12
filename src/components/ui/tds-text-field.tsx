"use client";

import {
  forwardRef,
  useId,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FADE, SPRING, useMotionTransition } from "./tds-motion";

/**
 * TDS TextField API를 따르는 자체 구현.
 * variant: box(사각 채움) / line(아래 선) / big(큰 글씨, 아래 선) / hero(대형, 아래 선)
 * 하위: TextField.Clearable / TextField.Password / TextField.Button
 */

export type TextFieldVariant = "box" | "line" | "big" | "hero";
export type TextFieldLabelOption = "appear" | "sustain";

export type TextFieldFormat = {
  /** 저장된 값 → 화면 표시 값 (예: 1000 → "1,000") */
  transform: (value: string) => string;
  /** 화면 입력 값 → 저장 값 (예: "1,000" → "1000"). onChange의 e.target.value는 이 값 */
  reset: (value: string) => string;
};

type FieldFrameProps = {
  variant: TextFieldVariant;
  label?: ReactNode;
  labelOption?: TextFieldLabelOption;
  help?: ReactNode;
  hasError?: boolean;
  disabled?: boolean;
  prefix?: string;
  suffix?: string;
  right?: ReactNode;
  paddingTop?: number;
  paddingBottom?: number;
  className?: string;
};

export type TextFieldProps = FieldFrameProps &
  Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "prefix" | "value" | "defaultValue" | "size" | keyof FieldFrameProps
  > & {
    value?: string;
    defaultValue?: string;
    format?: TextFieldFormat;
  };

/** variant별 확정 수치 */
const VARIANT = {
  box: { field: "min-h-[52px] rounded-control bg-divider px-4", text: "t5 font-medium" },
  line: { field: "min-h-[48px] border-b-2", text: "t5 font-medium" },
  big: { field: "min-h-[60px] border-b-2", text: "st5 font-semibold" },
  hero: { field: "min-h-[72px] border-b-2", text: "t1 font-bold" },
} as const;

function borderColor(variant: TextFieldVariant, focused: boolean, hasError: boolean) {
  if (variant === "box") {
    return hasError
      ? "ring-1 ring-negative"
      : focused
        ? "ring-1 ring-primary"
        : "ring-0";
  }
  return hasError ? "border-negative" : focused ? "border-primary" : "border-border";
}

/** 라벨·입력칸·help를 그리는 공용 틀 */
function FieldFrame({
  variant,
  label,
  labelOption = "appear",
  help,
  hasError = false,
  disabled = false,
  prefix,
  suffix,
  right,
  paddingTop,
  paddingBottom,
  className,
  hasValue,
  focused,
  labelFor,
  children,
}: FieldFrameProps & {
  hasValue: boolean;
  focused: boolean;
  labelFor?: string;
  children: ReactNode;
}) {
  const fade = useMotionTransition(FADE);
  const slide = useMotionTransition(SPRING.slide);
  const showLabel = label != null && (labelOption === "sustain" || hasValue);
  const v = VARIANT[variant];

  return (
    <div
      className={cn("flex w-full flex-col", disabled && "opacity-40", className)}
      style={{ paddingTop, paddingBottom }}
    >
      {/* 라벨 자리는 항상 확보해 레이아웃이 튀지 않게 한다 */}
      {label != null && (
        <div className="h-[22px]">
          <AnimatePresence initial={false}>
            {showLabel && (
              <motion.label
                htmlFor={labelFor}
                className={cn(
                  "t7 block font-medium",
                  hasError ? "text-negative" : focused ? "text-primary" : "text-fg-tertiary"
                )}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ ...slide, opacity: fade }}
              >
                {label}
              </motion.label>
            )}
          </AnimatePresence>
        </div>
      )}
      <div
        className={cn(
          "flex w-full items-center gap-1 transition-[border-color,box-shadow] duration-150",
          v.field,
          v.text,
          borderColor(variant, focused, hasError)
        )}
      >
        {prefix && <span className="shrink-0 text-fg-secondary">{prefix}</span>}
        {children}
        {suffix && <span className="shrink-0 text-fg-secondary">{suffix}</span>}
        {right != null && <span className="ml-1 flex shrink-0 items-center">{right}</span>}
      </div>
      {help != null && (
        <div className={cn("t7 mt-1.5", hasError ? "text-negative" : "text-fg-tertiary")}>{help}</div>
      )}
    </div>
  );
}

/** 값 상태(제어·비제어)와 format을 처리하는 훅 */
function useFieldValue(
  value: string | undefined,
  defaultValue: string | undefined,
  format: TextFieldFormat | undefined,
  onChange: ((e: ChangeEvent<HTMLInputElement>) => void) | undefined
) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const raw = value ?? inner;
  const display = format ? format.transform(raw) : raw;
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const next = format ? format.reset(e.target.value) : e.target.value;
    if (format) e.target.value = next;
    if (value === undefined) setInner(next);
    onChange?.(e);
  };
  const clear = () => {
    if (value === undefined) setInner("");
  };
  return { raw, display, handleChange, clear };
}

const BaseInput = forwardRef<
  HTMLInputElement,
  TextFieldProps & { rightOverride?: (ctx: { raw: string; focused: boolean; clear: () => void }) => ReactNode }
>(function BaseInput(
  {
    variant,
    label,
    labelOption,
    help,
    hasError,
    disabled,
    prefix,
    suffix,
    right,
    paddingTop,
    paddingBottom,
    className,
    value,
    defaultValue,
    format,
    onChange,
    onFocus,
    onBlur,
    id,
    rightOverride,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const { raw, display, handleChange, clear } = useFieldValue(value, defaultValue, format, onChange);

  return (
    <FieldFrame
      variant={variant}
      label={label}
      labelOption={labelOption}
      help={help}
      hasError={hasError}
      disabled={disabled}
      prefix={prefix}
      suffix={suffix}
      right={rightOverride ? rightOverride({ raw, focused, clear }) : right}
      paddingTop={paddingTop}
      paddingBottom={paddingBottom}
      className={className}
      hasValue={raw !== ""}
      focused={focused}
      labelFor={inputId}
    >
      <input
        {...rest}
        ref={ref}
        id={inputId}
        value={display}
        disabled={disabled}
        aria-invalid={hasError || undefined}
        onChange={handleChange}
        onFocus={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLInputElement>) => {
          setFocused(false);
          onBlur?.(e);
        }}
        className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-fg-disabled disabled:cursor-default"
      />
    </FieldFrame>
  );
});

const TextFieldRoot = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(props, ref) {
  return <BaseInput {...props} ref={ref} />;
});

/* ── TextField.Clearable ───────────────────────────────────────────────── */
export type TextFieldClearableProps = Omit<TextFieldProps, "right"> & { onClear?: () => void };

const Clearable = forwardRef<HTMLInputElement, TextFieldClearableProps>(function Clearable(
  { onClear, ...props },
  ref
) {
  return (
    <BaseInput
      {...props}
      ref={ref}
      rightOverride={({ raw, clear }) =>
        raw !== "" && !props.disabled ? (
          <button
            type="button"
            aria-label="지우기"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              clear();
              onClear?.();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-fg-disabled text-card"
          >
            <X className="h-3.5 w-3.5" strokeWidth={3} />
          </button>
        ) : null
      }
    />
  );
});

/* ── TextField.Password ────────────────────────────────────────────────── */
export type TextFieldPasswordProps = Omit<TextFieldProps, "right" | "type"> & {
  onVisibilityChange?: (visible: boolean) => void;
};

const Password = forwardRef<HTMLInputElement, TextFieldPasswordProps>(function Password(
  { onVisibilityChange, ...props },
  ref
) {
  const [visible, setVisible] = useState(false);
  return (
    <BaseInput
      {...props}
      ref={ref}
      type={visible ? "text" : "password"}
      rightOverride={() => (
        <button
          type="button"
          aria-label={visible ? "비밀번호 숨기기" : "비밀번호 보기"}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            const next = !visible;
            setVisible(next);
            onVisibilityChange?.(next);
          }}
          className="flex h-8 w-8 items-center justify-center text-fg-tertiary"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}
    />
  );
});

/* ── TextField.Button ──────────────────────────────────────────────────── */
export type TextFieldButtonProps = FieldFrameProps & {
  value?: string;
  placeholder?: string;
  onClick?: () => void;
  id?: string;
  "aria-label"?: string;
};

function FieldButton({
  value,
  placeholder,
  onClick,
  right,
  id,
  "aria-label": ariaLabel,
  ...frame
}: TextFieldButtonProps) {
  const autoId = useId();
  const buttonId = id ?? autoId;
  const [focused, setFocused] = useState(false);
  const hasValue = value != null && value !== "";
  return (
    <FieldFrame
      {...frame}
      right={right ?? <ChevronDown className="h-5 w-5 text-fg-tertiary" />}
      hasValue={hasValue}
      focused={focused}
      labelFor={buttonId}
    >
      <button
        id={buttonId}
        type="button"
        aria-label={ariaLabel}
        disabled={frame.disabled}
        onClick={onClick}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "min-w-0 flex-1 truncate bg-transparent text-left outline-none disabled:cursor-default",
          hasValue ? "text-foreground" : "text-fg-disabled"
        )}
      >
        {hasValue ? value : placeholder}
      </button>
    </FieldFrame>
  );
}

export const TextField = Object.assign(TextFieldRoot, {
  Clearable,
  Password,
  Button: FieldButton,
});
