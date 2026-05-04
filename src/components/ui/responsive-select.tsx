"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useIsDesktopMd } from "@/hooks/use-is-desktop-md";

export type ResponsiveSelectOption = { value: string; label: string };

export type ResponsiveSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ResponsiveSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  size?: "sm" | "default";
  /** 데스크톱 커스텀 SelectValue 표시용 (모바일 네이티브는 options.label만 사용) */
  renderValue?: (value: string | null) => React.ReactNode;
};

/**
 * 모바일(&lt; md): 네이티브 `&lt;select&gt;` → iOS Safari에서 시스템 피커(휠·액션시트), Android도 OS 기본 선택 UI.
 * 데스크톱(md+): 기존 Base UI Select(커스텀 드롭다운).
 */
export function ResponsiveSelect({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
  id,
  name,
  className,
  triggerClassName,
  contentClassName,
  size = "default",
  renderValue,
}: ResponsiveSelectProps) {
  const isDesktop = useIsDesktopMd();
  const labelMap = React.useMemo(
    () => Object.fromEntries(options.map((o) => [o.value, o.label])),
    [options]
  );

  const desktopSelect = (
    <Select
      value={value}
      onValueChange={(v) => onValueChange(v ?? "")}
      disabled={disabled}
    >
      <SelectTrigger id={id} size={size} className={cn("w-full", triggerClassName)}>
        <SelectValue placeholder={placeholder}>
          {(v: string | null) =>
            renderValue ? renderValue(v) : v != null && v !== "" && labelMap[v] != null ? labelMap[v] : null
          }
        </SelectValue>
      </SelectTrigger>
      <SelectContent className={cn("rounded-2xl", contentClassName)}>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const mobileNative = (
    <div className={cn("relative w-full", className)}>
      <select
        id={id}
        name={name}
        disabled={disabled}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          "flex w-full appearance-none rounded-xl border border-slate-100 bg-slate-50 py-2 pl-3 pr-10 text-base text-foreground outline-none transition-colors",
          "focus:border-primary focus:ring-2 focus:ring-primary/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "dark:border-white/10 dark:bg-white/5 dark:text-slate-100",
          size === "sm" ? "h-8 min-h-8 text-sm" : "h-11 min-h-11",
          triggerClassName
        )}
        aria-label={placeholder}
      >
        {placeholder != null && (
          <option value="" disabled={value !== ""}>
            {placeholder}
          </option>
        )}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  );

  return isDesktop ? (
    <div className={cn("w-full", className)}>{desktopSelect}</div>
  ) : (
    mobileNative
  );
}
