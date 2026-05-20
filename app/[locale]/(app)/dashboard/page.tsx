import { getLocale, getTranslations } from "next-intl/server";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardPodium } from "@/components/dashboard/leaderboard-podium";
import { FinanceStatusCard } from "@/components/dashboard/finance-status-card";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-quick-actions";
import { RecentActivityPlaceholder } from "@/components/dashboard/recent-activity-placeholder";
import { formatDate } from "@/lib/format";
import {
  filterUnsettled,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
} from "@/lib/ledger-balances";
import { centsToDisplay } from "@/lib/money";

export default async function DashboardPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const locale = await getLocale();
  const tc = await getTranslations("common");

  const [
    { data: leaderboard },
    { data: chores },
    { data: debts },
    { count: memberCount },
    { data: recentExpenses },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, total_xp, current_level, avatar_url")
      .eq("house_id", session.house.id)
      .order("total_xp", { ascending: false })
      .limit(3),
    supabase
      .from("chores")
      .select("id, title, xp_reward, last_completed_at")
      .eq("house_id", session.house.id)
      .is("last_completed_at", null),
    supabase
      .from("debt_ledger")
      .select(
        "id, amount_cents, debtor_id, creditor_id, expense_id, settled_at",
      )
      .eq("house_id", session.house.id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("house_id", session.house.id),
    supabase
      .from("expenses")
      .select("title, amount_cents, created_at, payer_id")
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const { data: members } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .eq("house_id", session.house.id);

  const payerNames = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.username]),
  );
  const payerAvatars = Object.fromEntries(
    (members ?? []).map((m) => [m.id, m.avatar_url]),
  );

  const debtRows = debts ?? [];
  const youOweCents = sumYouOweCents(debtRows, session.userId);
  const youreOwedCents = sumYoureOwedCents(debtRows, session.userId);
  const netCents = netBalanceCents(debtRows, session.userId);
  const hasUnsettledDebts = filterUnsettled(debtRows).length > 0;

  const entries = (leaderboard ?? []).map((m) => ({
    username: m.username,
    total_xp: m.total_xp,
    avatar_url: m.avatar_url,
  }));

  const pendingChores = (chores ?? []).length;
  const leader = entries[0];

  const activityRows = (recentExpenses ?? []).map((expense) => ({
    username: payerNames[expense.payer_id] ?? tc("unknown"),
    avatar_url: payerAvatars[expense.payer_id],
    time: formatDate(expense.created_at, locale),
    type: "shopping" as const,
    item: expense.title,
    amountDisplay: centsToDisplay(expense.amount_cents, { locale }),
  }));

  return (
    <>
      <LeaderboardPodium
        entries={entries}
        leaderName={leader?.username}
      />

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-5">
          <FinanceStatusCard
            netCents={netCents}
            youOweCents={youOweCents}
            youreOwedCents={youreOwedCents}
            memberCount={memberCount ?? 0}
            hasUnsettledDebts={hasUnsettledDebts}
          />
        </div>
        <div className="lg:col-span-7">
          <DashboardQuickActions
            pendingChoresCount={pendingChores}
            memberCount={memberCount ?? 0}
          />
        </div>
      </div>

      {activityRows.length > 0 && (
        <RecentActivityPlaceholder rows={activityRows} />
      )}
    </>
  );
}
