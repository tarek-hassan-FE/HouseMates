"use client";

import { cn } from "@/lib/utils";

type ProfileToggleProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  label: string;
};

export function ProfileToggle({
  checked,
  onCheckedChange,
  disabled,
  label,
}: ProfileToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative h-6 w-12 shrink-0 rounded-full transition-colors duration-200",
        checked ? "bg-primary" : "bg-outline-variant",
        disabled && "opacity-60",
      )}
    >
      <span
        className={cn(
          "absolute top-1 size-4 rounded-full bg-white transition-all duration-200",
          checked ? "end-1" : "start-1",
        )}
      />
    </button>
  );
}
