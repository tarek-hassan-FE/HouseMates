import { cn } from "@/lib/utils";

export function XpBadge({
  xp,
  className,
}: {
  xp: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "bg-tertiary-fixed text-on-tertiary-fixed rounded-full px-3 py-1 text-[10px] font-bold",
        className,
      )}
    >
      +{xp} XP
    </span>
  );
}
