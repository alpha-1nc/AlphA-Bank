"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export function FieldSwitch({
  label,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-control bg-background px-3 py-2 transition-colors">
      <span className="t6 font-medium text-foreground">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50",
          checked ? "bg-primary" : "bg-fg-disabled"
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-card transition-transform duration-200 ease-out",
            checked && "translate-x-5"
          )}
        />
      </button>
    </div>
  );
}

export function HourlyWageField({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  return (
    <div className="space-y-2">
      <label
        htmlFor={id}
        className="t7 font-medium text-fg-tertiary ml-1"
      >
        시급 (원)
      </label>
      <Input
        id={id}
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="t6 h-11 rounded-control border-0 bg-background text-foreground"
      />
    </div>
  );
}
