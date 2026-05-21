import { equalSharesAmongMembers } from "@/lib/split-equal";
import {
  SHARE_FIELD_PREFIX,
  parseShareFieldsFromFormData,
  validateExactShares,
  type ExactSplitShare,
  type ExactSplitValidationError,
  type ExactSplitValidationResult,
} from "@/lib/split-exact-validate";

export {
  SHARE_FIELD_PREFIX,
  parseShareFieldsFromFormData,
  validateExactShares,
  equalSharesAmongMembers,
  type ExactSplitShare,
  type ExactSplitValidationError,
  type ExactSplitValidationResult,
};

/** Convert equal-split cents to display strings per member (EGP decimals). */
export function equalShareStringsFromCents(
  sharesCents: Record<string, number>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(sharesCents).map(([id, cents]) => [
      id,
      (cents / 100).toFixed(2),
    ]),
  );
}

/** Build expense list subtitle from debts linked to an expense. */
export function formatExactSplitBreakdown(
  debts: { debtorId: string; amountCents: number }[],
  payerNames: Record<string, string>,
  locale: string,
  formatCents: (cents: number, locale: string) => string,
): string {
  const parts: string[] = [];
  for (const d of debts) {
    const name = payerNames[d.debtorId] ?? d.debtorId;
    parts.push(`${name}: ${formatCents(d.amountCents, locale)}`);
  }
  return parts.join(" · ");
}
