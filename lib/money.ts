/** Store and display money as integer cents only (EGP for Egypt market). */

import { intlLocale } from "@/lib/format";

const DEFAULT_CURRENCY = "EGP";

const ARABIC_INDIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC_DIGITS.indexOf(d)));
}

export function centsToDisplay(
  cents: number,
  options?: { locale?: string },
): string {
  const locale = options?.locale ?? "en";
  return new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: DEFAULT_CURRENCY,
  }).format(cents / 100);
}

export function parseAmountToCents(value: string): number | null {
  const normalized = normalizeDigits(value).replace(/[^0-9.]/g, "");
  if (!normalized) return null;
  const amount = Number.parseFloat(normalized);
  if (Number.isNaN(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}
