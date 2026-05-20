/** Pure helpers for ledger balance and expense settlement status. */

export type DebtForBalance = {
  id: string;
  amount_cents: number;
  debtor_id: string;
  creditor_id: string;
  expense_id: string | null;
  settled_at: string | null;
};

export type DebtRow = {
  otherUserId: string;
  amountCents: number;
  direction: "you_owe" | "owes_you";
};

function isUnsettled(debt: { settled_at: string | null }): boolean {
  return debt.settled_at == null;
}

export function filterUnsettled<T extends { settled_at: string | null }>(
  debts: T[],
): T[] {
  return debts.filter(isUnsettled);
}

export function sumYouOweCents(
  debts: DebtForBalance[],
  userId: string,
): number {
  return filterUnsettled(debts)
    .filter((d) => d.debtor_id === userId)
    .reduce((s, d) => s + d.amount_cents, 0);
}

export function sumYoureOwedCents(
  debts: DebtForBalance[],
  userId: string,
): number {
  return filterUnsettled(debts)
    .filter((d) => d.creditor_id === userId)
    .reduce((s, d) => s + d.amount_cents, 0);
}

export function netBalanceCents(
  debts: DebtForBalance[],
  userId: string,
): number {
  return sumYoureOwedCents(debts, userId) - sumYouOweCents(debts, userId);
}

export type ExpenseSettlementStatus = "pending" | "settled";

/** Expense is pending if any linked unsettled debt exists. */
export function expenseSettlementStatus(
  expenseId: string,
  debts: DebtForBalance[],
): ExpenseSettlementStatus {
  const linked = filterUnsettled(debts).filter(
    (d) => d.expense_id === expenseId,
  );
  return linked.length > 0 ? "pending" : "settled";
}

export function filterExpensesByStatus<T extends { id: string }>(
  expenses: T[],
  debts: DebtForBalance[],
  filter: "all" | "pending" | "settled",
): T[] {
  if (filter === "all") return expenses;
  return expenses.filter((e) => {
    const status = expenseSettlementStatus(e.id, debts);
    return filter === "pending" ? status === "pending" : status === "settled";
  });
}

/** Net bilateral balance per other member (unsettled only). */
export function buildDebtRows(
  debts: DebtForBalance[],
  userId: string,
  memberIds: string[],
): DebtRow[] {
  const unsettled = filterUnsettled(debts);
  const rows: DebtRow[] = [];

  for (const otherId of memberIds) {
    if (otherId === userId) continue;

    let youOwe = 0;
    let owesYou = 0;

    for (const d of unsettled) {
      if (d.debtor_id === userId && d.creditor_id === otherId) {
        youOwe += d.amount_cents;
      } else if (d.debtor_id === otherId && d.creditor_id === userId) {
        owesYou += d.amount_cents;
      }
    }

    const net = owesYou - youOwe;
    if (net === 0) continue;

    rows.push({
      otherUserId: otherId,
      amountCents: Math.abs(net),
      direction: net > 0 ? "owes_you" : "you_owe",
    });
  }

  return rows;
}
