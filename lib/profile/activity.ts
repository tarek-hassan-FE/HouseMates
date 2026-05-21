export type ProfileActivityKind = "chore" | "expense";

export type ProfileActivityItem = {
  id: string;
  kind: ProfileActivityKind;
  title: string;
  occurredAt: string;
  xpReward?: number;
  settled?: boolean;
};

type ChoreCompletionRow = {
  id: string;
  xp_reward: number;
  reviewed_at: string | null;
  chores: { title: string } | { title: string }[] | null;
};

type ExpenseRow = {
  id: string;
  title: string;
  created_at: string;
};

type DebtRow = {
  expense_id: string | null;
  settled_at: string | null;
};

export function mapChoreCompletionsToActivity(
  rows: ChoreCompletionRow[],
): ProfileActivityItem[] {
  return rows
    .filter((r) => r.reviewed_at)
    .map((row) => {
      const chore = Array.isArray(row.chores) ? row.chores[0] : row.chores;
      return {
        id: `chore-${row.id}`,
        kind: "chore" as const,
        title: chore?.title ?? "Chore",
        occurredAt: row.reviewed_at!,
        xpReward: row.xp_reward,
      };
    });
}

export function mapExpensesToActivity(
  expenses: ExpenseRow[],
  debtsByExpense: Map<string, DebtRow[]>,
): ProfileActivityItem[] {
  return expenses.map((exp) => {
    const related = debtsByExpense.get(exp.id) ?? [];
    const settled =
      related.length === 0 ||
      related.every((d) => d.settled_at != null);
    return {
      id: `expense-${exp.id}`,
      kind: "expense" as const,
      title: exp.title,
      occurredAt: exp.created_at,
      settled,
    };
  });
}

export function mergeProfileActivity(
  chores: ProfileActivityItem[],
  expenses: ProfileActivityItem[],
  limit = 10,
): ProfileActivityItem[] {
  return [...chores, ...expenses]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}

export function buildDebtsByExpenseMap(debts: DebtRow[]): Map<string, DebtRow[]> {
  const map = new Map<string, DebtRow[]>();
  for (const d of debts) {
    if (!d.expense_id) continue;
    const list = map.get(d.expense_id) ?? [];
    list.push(d);
    map.set(d.expense_id, list);
  }
  return map;
}
