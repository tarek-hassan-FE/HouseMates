import Image from "next/image";
import { cn } from "@/lib/utils";

type AvatarRingProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: "primary" | "secondary" | "neutral";
  className?: string;
};

const sizeMap = {
  sm: { box: "size-8", text: "text-xs" },
  md: { box: "size-10", text: "text-sm" },
  lg: { box: "size-16", text: "text-lg" },
};

const ringMap = {
  primary: "border-primary-fixed",
  secondary: "border-secondary-container",
  neutral: "border-surface-container-highest",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AvatarRing({
  src,
  name,
  size = "md",
  ring = "neutral",
  className,
}: AvatarRingProps) {
  const s = sizeMap[size];

  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border-2 shadow-sm",
        s.box,
        ringMap[ring],
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          fill
          className="object-cover"
          sizes={size === "lg" ? "80px" : "40px"}
        />
      ) : (
        <div
          className={cn(
            "bg-primary-container text-on-primary-container flex size-full items-center justify-center font-bold",
            s.text,
          )}
        >
          {initials(name)}
        </div>
      )}
    </div>
  );
}
