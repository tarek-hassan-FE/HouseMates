import { cn } from "@/lib/utils";

type MaterialIconProps = {
  name: string;
  className?: string;
  filled?: boolean;
  size?: number;
};

export function MaterialIcon({
  name,
  className,
  filled = false,
  size = 24,
}: MaterialIconProps) {
  return (
    <span
      className={cn(
        "material-symbols-outlined inline-flex shrink-0 select-none leading-none",
        filled && "fill-icon",
        className,
      )}
      style={{ fontSize: size }}
      aria-hidden
    >
      {name}
    </span>
  );
}
