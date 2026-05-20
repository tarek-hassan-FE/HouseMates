import { cn } from "@/lib/utils";

type StatusVariant = "settled" | "pending" | "error" | "neutral";

const variantStyles: Record<StatusVariant, string> = {
  settled: "bg-tertiary/10 text-tertiary",
  pending: "bg-secondary-container/20 text-secondary",
  error: "bg-error/10 text-error",
  neutral: "bg-surface-container-high text-on-surface-variant",
};

export function StatusBadge({
  label,
  variant = "neutral",
  className,
}: {
  label: string;
  variant?: StatusVariant;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "text-label-sm rounded-full px-3 py-1 font-bold uppercase tracking-wider",
        variantStyles[variant],
        className,
      )}
    >
      {label}
    </span>
  );
}
