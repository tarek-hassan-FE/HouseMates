"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { Locale } from "@/i18n/routing";

type LocaleSwitcherProps = {
  variant?: "compact" | "full";
  className?: string;
};

export function LocaleSwitcher({
  variant = "compact",
  className,
}: LocaleSwitcherProps) {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("locale");

  function switchLocale(next: Locale) {
    if (next === locale) return;
    router.replace(pathname, { locale: next });
    router.refresh();
  }

  if (variant === "full") {
    return (
      <div className={cn("flex flex-col gap-2", className)}>
        <span className="text-label-md text-on-surface-variant font-semibold">
          {t("language")}
        </span>
        <div className="border-outline-variant/30 flex rounded-xl border p-1">
          {(["en", "ar"] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => switchLocale(loc)}
              className={cn(
                "text-label-md flex-1 rounded-lg px-4 py-2 font-semibold transition-colors",
                locale === loc
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-highest",
              )}
            >
              {loc === "en" ? t("english") : t("arabic")}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-outline-variant/30 flex rounded-full border p-0.5",
        className,
      )}
      role="group"
      aria-label={t("language")}
    >
      {(["en", "ar"] as const).map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={cn(
            "text-label-sm min-h-11 min-w-11 rounded-full px-3 font-bold transition-colors",
            locale === loc
              ? "bg-primary-container text-on-primary-container"
              : "text-on-surface-variant hover:text-on-surface",
          )}
        >
          {loc === "en" ? "EN" : "ع"}
        </button>
      ))}
    </div>
  );
}
