/** Equal split of an expense among house members (payer included in denominator). */

export type EqualSplitDebt = {
  debtorId: string;
  amountCents: number;
};

/**
 * Each non-payer owes the payer their share of `amountCents / memberCount`.
 * Remainder cents are distributed +1 to the first debtors (stable member order).
 */
export function splitEqualAmongMembers(
  amountCents: number,
  memberIds: string[],
  payerId: string,
): EqualSplitDebt[] {
  const sorted = [...memberIds].sort();
  const n = sorted.length;
  if (n <= 1 || amountCents <= 0) return [];

  const baseShare = Math.floor(amountCents / n);
  const remainder = amountCents - baseShare * n;
  const debtors = sorted.filter((id) => id !== payerId);

  return debtors.map((debtorId, index) => ({
    debtorId,
    amountCents: baseShare + (index < remainder ? 1 : 0),
  }));
}

/** Sum of debt amounts (for tests). */
export function totalDebtCents(debts: EqualSplitDebt[]): number {
  return debts.reduce((sum, d) => sum + d.amountCents, 0);
}

/** Per-member share amounts (cents) for an equal split (payer included). */
export function equalSharesAmongMembers(
  amountCents: number,
  memberIds: string[],
  payerId: string,
): Record<string, number> {
  const sorted = [...memberIds].sort();
  const debts = splitEqualAmongMembers(amountCents, sorted, payerId);
  const debtByMember = Object.fromEntries(
    debts.map((d) => [d.debtorId, d.amountCents]),
  );
  const payerShare = amountCents - totalDebtCents(debts);
  return Object.fromEntries(
    sorted.map((id) => [id, id === payerId ? payerShare : (debtByMember[id] ?? 0)]),
  );
}
