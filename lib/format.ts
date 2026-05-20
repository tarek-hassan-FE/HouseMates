import type { Locale } from "@/i18n/routing";

export function intlLocale(locale: string): string {
  return locale === "ar" ? "ar-EG" : "en-EG";
}

export function formatDate(
  date: Date | string,
  locale: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(intlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...options,
  });
}

export function formatNumber(value: number, locale: string): string {
  return value.toLocaleString(intlLocale(locale as Locale));
}
