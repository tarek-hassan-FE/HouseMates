import type { ExpenseSource } from "@/lib/database.types";

export type HouseActivityKind =
  | "chore_completed"
  | "shopping_list_added"
  | "expense_added"
  | "purchase_completed";

export type HouseActivityItem = {
  id: string;
  kind: HouseActivityKind;
  actorId: string;
  occurredAt: string;
  title: string;
  amountCents?: number;
  xpReward?: number;
  imageUrl?: string | null;
};

type ChoreJoin = { title: string } | { title: string }[] | null;

type ChoreCompletionRow = {
  id: string;
  submitted_by: string;
  xp_reward: number;
  reviewed_at: string | null;
  proof_image_url?: string | null;
  chores: ChoreJoin;
};

type AdminChoreCompleteRow = {
  id: string;
  title: string;
  xp_reward: number;
  last_completed_at: string | null;
  last_completed_by: string | null;
  last_proof_image_url?: string | null;
};

type ShoppingListRow = {
  id: string;
  title: string;
  created_by: string;
  created_at: string;
};

type ExpenseActivityRow = {
  id: string;
  title: string;
  amount_cents: number;
  payer_id: string;
  created_at: string;
  source: ExpenseSource;
  receipt_url?: string | null;
};

function choreTitle(chores: ChoreJoin): string {
  const chore = Array.isArray(chores) ? chores[0] : chores;
  return chore?.title ?? "Chore";
}

export function mapChoreCompletionsToHouseActivity(
  rows: ChoreCompletionRow[],
): HouseActivityItem[] {
  return rows
    .filter((r) => r.reviewed_at)
    .map((row) => ({
      id: `chore-completion-${row.id}`,
      kind: "chore_completed" as const,
      actorId: row.submitted_by,
      occurredAt: row.reviewed_at!,
      title: choreTitle(row.chores),
      xpReward: row.xp_reward,
      imageUrl: row.proof_image_url ?? null,
    }));
}

export function mapAdminChoreCompletesToHouseActivity(
  chores: AdminChoreCompleteRow[],
  approvedCompletionChoreIds: Set<string>,
): HouseActivityItem[] {
  return chores
    .filter(
      (c) =>
        c.last_completed_at &&
        c.last_completed_by &&
        !approvedCompletionChoreIds.has(c.id),
    )
    .map((row) => ({
      id: `chore-admin-${row.id}-${row.last_completed_at}`,
      kind: "chore_completed" as const,
      actorId: row.last_completed_by!,
      occurredAt: row.last_completed_at!,
      title: row.title,
      xpReward: row.xp_reward,
      imageUrl: row.last_proof_image_url ?? null,
    }));
}

/** Chore IDs that have an approved completion (for admin-instant dedupe). */
export function approvedCompletionChoreIdsFromRows(
  rows: { chore_id: string; reviewed_at: string | null; status: string }[],
): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    if (row.status === "approved" && row.reviewed_at) {
      ids.add(row.chore_id);
    }
  }
  return ids;
}

export function mapShoppingListAddsToHouseActivity(
  rows: ShoppingListRow[],
): HouseActivityItem[] {
  return rows.map((row) => ({
    id: `shopping-add-${row.id}`,
    kind: "shopping_list_added" as const,
    actorId: row.created_by,
    occurredAt: row.created_at,
    title: row.title,
  }));
}

export function mapExpensesToHouseActivity(
  rows: ExpenseActivityRow[],
): HouseActivityItem[] {
  return rows.map((row) => {
    const isPurchase = row.source === "shopping";
    return {
      id: `${isPurchase ? "purchase" : "expense"}-${row.id}`,
      kind: isPurchase ? "purchase_completed" : "expense_added",
      actorId: row.payer_id,
      occurredAt: row.created_at,
      title: row.title,
      amountCents: row.amount_cents,
      imageUrl: row.receipt_url ?? null,
    };
  });
}

export function mergeHouseActivity(
  items: HouseActivityItem[],
  limit = 8,
): HouseActivityItem[] {
  return [...items]
    .sort(
      (a, b) =>
        new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    )
    .slice(0, limit);
}
