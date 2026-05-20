"use client";

import { useLocale, useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { Menu } from "@base-ui/react/menu";
import { cn } from "@/lib/utils";
import { MaterialIcon } from "@/components/design/material-icon";
import type { Locale } from "@/i18n/routing";

const LOCALES: { code: Locale; label: string; flag: string }[] = [
  { code: "en", label: "EN", flag: "🇬🇧" },
  { code: "ar", label: "ع", flag: "🇪🇬" },
];

function localeMeta(code: Locale) {
  return LOCALES.find((l) => l.code === code) ?? LOCALES[0];
}

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
          {LOCALES.map(({ code, label, flag }) => (
            <button
              key={code}
              type="button"
              onClick={() => switchLocale(code)}
              className={cn(
                "text-label-md flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 font-semibold transition-colors",
                locale === code
                  ? "bg-primary-container text-on-primary-container"
                  : "text-on-surface-variant hover:bg-surface-container-highest",
              )}
            >
              <span aria-hidden>{flag}</span>
              {code === "en" ? t("english") : t("arabic")}
              <span className="text-on-surface-variant/80 text-label-sm">
                ({label})
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const active = localeMeta(locale);

  return (
    <Menu.Root>
      <Menu.Trigger
        className={cn(
          "btn-press border-outline-variant/30 text-label-sm flex min-h-11 items-center gap-1.5 rounded-full border px-3 font-bold transition-colors",
          className,
        )}
        aria-label={t("language")}
        aria-haspopup="menu"
      >
        <span aria-hidden className="text-base leading-none">
          {active.flag}
        </span>
        <span>{active.label}</span>
        <MaterialIcon name="expand_more" size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={6} align="end">
          <Menu.Popup className="bg-surface-container-lowest border-outline-variant/20 z-[60] min-w-[7rem] rounded-xl border p-1 shadow-lg">
            {LOCALES.map(({ code, label, flag }) => (
              <Menu.Item
                key={code}
                className={cn(
                  "text-label-md btn-press flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-semibold outline-none",
                  locale === code
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface hover:bg-surface-container-highest",
                )}
                onClick={() => switchLocale(code)}
              >
                <span aria-hidden>{flag}</span>
                {label}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
