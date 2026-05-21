import { LedgerPanel } from "@/components/ledger/ledger-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { paymentReminderCooldowns } from "@/lib/payment-reminder-cooldown";
import { fetchPaymentRemindersSentByActor } from "@/lib/notifications-data";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/database.types";

export default async function LedgerPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const [{ data: expenses }, { data: members }, { data: debts }] =
    await Promise.all([
      supabase
        .from("expenses")
        .select("*")
        .eq("house_id", session.house.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("house_id", session.house.id),
      supabase
        .from("debt_ledger")
        .select(
          "id, amount_cents, debtor_id, creditor_id, expense_id, settled_at",
        )
        .eq("house_id", session.house.id),
    ]);

  const payerNames = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.username]),
  );

  const sentReminders = await fetchPaymentRemindersSentByActor(
    supabase,
    session.userId,
  );
  const reminderCooldowns = paymentReminderCooldowns(
    sentReminders,
    session.userId,
  );

  return (
    <LedgerPanel
      expenses={(expenses ?? []) as Expense[]}
      debts={debts ?? []}
      members={members ?? []}
      memberCount={(members ?? []).length}
      payerNames={payerNames}
      userId={session.userId}
      reminderCooldowns={reminderCooldowns}
    />
  );
}
