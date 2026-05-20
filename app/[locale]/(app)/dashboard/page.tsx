import { getLocale, getTranslations } from "next-intl/server";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { LeaderboardPodium } from "@/components/dashboard/leaderboard-podium";
import { FinanceStatusCard } from "@/components/dashboard/finance-status-card";
import {
  DashboardFab,
  DashboardProvider,
  DashboardQuickActions,
} from "@/components/dashboard/dashboard-client";
import { RecentActivityPlaceholder } from "@/components/dashboard/recent-activity-placeholder";
import { formatDate } from "@/lib/format";
import {
  filterUnsettled,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
} from "@/lib/ledger-balances";
import { centsToDisplay } from "@/lib/money";
import type { Profile, ShoppingListItem } from "@/lib/database.types";

export default async function DashboardPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const locale = await getLocale();
  const tc = await getTranslations("common");

  const [
    { data: leaderboard },
    { data: chores },
    { data: pendingCompletions },
    { data: debts },
    { count: memberCount },
    { data: recentExpenses },
    { data: shoppingListRows },
    { data: houseMembers },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, total_xp, current_level, avatar_url")
      .eq("house_id", session.house.id)
      .order("total_xp", { ascending: false })
      .limit(3),
    supabase
      .from("chores")
      .select("id, last_completed_at")
      .eq("house_id", session.house.id)
      .is("last_completed_at", null),
    supabase
      .from("chore_completions")
      .select("chore_id")
      .eq("house_id", session.house.id)
      .eq("status", "pending"),
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
    supabase
      .from("shopping_list_items")
      .select("id, house_id, title, created_by, created_at")
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select(
        "id, username, house_role, total_xp, current_level, house_id, avatar_url, created_at",
      )
      .eq("house_id", session.house.id),
  ]);

  const shoppingListItems: ShoppingListItem[] = (shoppingListRows ?? []).map(
    (row) => ({
      id: row.id,
      house_id: row.house_id,
      title: row.title,
      created_by: row.created_by,
      created_at: row.created_at,
    }),
  );

  const members: Profile[] = (houseMembers ?? []) as Profile[];

  const payerNames = Object.fromEntries(
    members.map((m) => [m.id, m.username]),
  );
  const payerAvatars = Object.fromEntries(
    members.map((m) => [m.id, m.avatar_url]),
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

  const pendingChoreIds = new Set(
    (pendingCompletions ?? []).map((c) => c.chore_id),
  );
  const pendingChores = (chores ?? []).filter(
    (c) => !pendingChoreIds.has(c.id),
  ).length;
  const pendingApprovals = (pendingCompletions ?? []).length;
  const leader = entries[0];

  const activityRows = (recentExpenses ?? []).map((expense) => ({
    username: payerNames[expense.payer_id] ?? tc("unknown"),
    avatar_url: payerAvatars[expense.payer_id],
    time: formatDate(expense.created_at, locale),
    type: "shopping" as const,
    item: expense.title,
    amountDisplay: centsToDisplay(expense.amount_cents, { locale }),
  }));

  const dashboardProps = {
    pendingChoresCount: pendingChores,
    pendingApprovalsCount: session.isAdmin ? pendingApprovals : 0,
    memberCount: memberCount ?? 0,
    isAdmin: session.isAdmin,
    isSoloHouse: (memberCount ?? 0) <= 1,
    members,
    shoppingListItems,
  };

  return (
    <DashboardProvider
      memberCount={dashboardProps.memberCount}
      shoppingListItems={dashboardProps.shoppingListItems}
    >
      <InstallAppPrompt />
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
            pendingChoresCount={dashboardProps.pendingChoresCount}
            pendingApprovalsCount={dashboardProps.pendingApprovalsCount}
          />
        </div>
      </div>

      {activityRows.length > 0 && (
        <RecentActivityPlaceholder rows={activityRows} />
      )}

      <DashboardFab
        isAdmin={dashboardProps.isAdmin}
        isSoloHouse={dashboardProps.isSoloHouse}
        memberCount={dashboardProps.memberCount}
        members={dashboardProps.members}
        shoppingListItems={dashboardProps.shoppingListItems}
      />
    </DashboardProvider>
  );
}
