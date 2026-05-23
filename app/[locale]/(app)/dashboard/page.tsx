import { getLocale, getTranslations } from "next-intl/server";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SupportSectionCard } from "@/components/dashboard/buy-coffee-card";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { LeaderboardPodium } from "@/components/dashboard/leaderboard-podium";
import { FinanceStatusCard } from "@/components/dashboard/finance-status-card";
import { DashboardQuickActions } from "@/components/dashboard/dashboard-client";
import {
  RecentActivityPlaceholder,
  type DashboardActivityRow,
} from "@/components/dashboard/recent-activity-placeholder";
import { formatDate } from "@/lib/format";
import {
  approvedCompletionChoreIdsFromRows,
  mapAdminChoreCompletesToHouseActivity,
  mapChoreCompletionsToHouseActivity,
  mapExpensesToHouseActivity,
  mapShoppingListAddsToHouseActivity,
  mergeHouseActivity,
} from "@/lib/house/activity";
import {
  debtorsWhoOweYou,
  filterUnsettled,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
} from "@/lib/ledger-balances";
import { paymentReminderCooldowns } from "@/lib/payment-reminder-cooldown";
import { fetchPaymentRemindersSentByActor } from "@/lib/notifications-data";
import { centsToDisplay } from "@/lib/money";
import type { Profile } from "@/lib/database.types";

export default async function DashboardPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const locale = await getLocale();
  const tc = await getTranslations("common");

  await supabase.rpc("reactivate_due_chores", {
    p_house_id: session.house.id,
  });

  const [
    { data: leaderboard },
    { data: chores },
    { data: pendingCompletions },
    { data: debts },
    { count: memberCount },
    { data: recentExpenses },
    { data: houseMembers },
    { data: choreCompletionActivity },
    { data: approvedCompletionsForDedupe },
    { data: adminChoreCompletes },
    { data: recentShoppingAdds },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, total_xp, current_level, avatar_url")
      .eq("house_id", session.house.id)
      .eq("leaderboard_visible", true)
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
      .select(
        "id, title, amount_cents, created_at, payer_id, source, receipt_url",
      )
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("profiles")
      .select(
        "id, username, house_role, total_xp, current_level, house_id, avatar_url, created_at",
      )
      .eq("house_id", session.house.id),
    supabase
      .from("chore_completions")
      .select(
        "id, submitted_by, xp_reward, reviewed_at, proof_image_url, chores!inner(title)",
      )
      .eq("house_id", session.house.id)
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(10),
    supabase
      .from("chore_completions")
      .select("chore_id, reviewed_at, status")
      .eq("house_id", session.house.id)
      .eq("status", "approved")
      .not("reviewed_at", "is", null),
    supabase
      .from("chores")
      .select(
        "id, title, xp_reward, last_completed_at, last_completed_by, last_proof_image_url",
      )
      .eq("house_id", session.house.id)
      .not("last_completed_at", "is", null)
      .order("last_completed_at", { ascending: false })
      .limit(10),
    supabase
      .from("shopping_list_items")
      .select("id, title, created_by, created_at")
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const members: Profile[] = (houseMembers ?? []) as Profile[];

  const memberNames = Object.fromEntries(
    members.map((m) => [m.id, m.username]),
  );
  const memberAvatars = Object.fromEntries(
    members.map((m) => [m.id, m.avatar_url]),
  );

  const debtRows = debts ?? [];
  const youOweCents = sumYouOweCents(debtRows, session.userId);
  const youreOwedCents = sumYoureOwedCents(debtRows, session.userId);
  const netCents = netBalanceCents(debtRows, session.userId);
  const hasUnsettledDebts = filterUnsettled(debtRows).length > 0;
  const debtorIds = debtorsWhoOweYou(debtRows, session.userId).map(
    (d) => d.debtorId,
  );
  const sentReminders = await fetchPaymentRemindersSentByActor(
    supabase,
    session.userId,
  );
  const reminderCooldowns = paymentReminderCooldowns(
    sentReminders,
    session.userId,
  );

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

  const approvedChoreIds = approvedCompletionChoreIdsFromRows(
    approvedCompletionsForDedupe ?? [],
  );

  const mergedActivity = mergeHouseActivity(
    [
      ...mapChoreCompletionsToHouseActivity(choreCompletionActivity ?? []),
      ...mapAdminChoreCompletesToHouseActivity(
        adminChoreCompletes ?? [],
        approvedChoreIds,
      ),
      ...mapShoppingListAddsToHouseActivity(recentShoppingAdds ?? []),
      ...mapExpensesToHouseActivity(
        (recentExpenses ?? []).map((e) => ({
          ...e,
          source: (e.source ?? "ledger") as "ledger" | "shopping",
        })),
      ),
    ],
    8,
  );

  const activityRows: DashboardActivityRow[] = mergedActivity.map((item) => ({
    id: item.id,
    kind: item.kind,
    username: memberNames[item.actorId] ?? tc("unknown"),
    avatar_url: memberAvatars[item.actorId],
    time: formatDate(item.occurredAt, locale),
    title: item.title,
    amountDisplay:
      item.amountCents != null
        ? centsToDisplay(item.amountCents, { locale })
        : undefined,
    xpReward: item.xpReward,
    imageUrl: item.imageUrl,
  }));

  const dashboardProps = {
    pendingChoresCount: pendingChores,
    pendingApprovalsCount: session.isAdmin ? pendingApprovals : 0,
  };

  return (
    <>
      <InstallAppPrompt />
      <SupportSectionCard />
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
            debtorIds={debtorIds}
            reminderCooldowns={reminderCooldowns}
          />
        </div>
        <div className="lg:col-span-7">
          <DashboardQuickActions
            pendingChoresCount={dashboardProps.pendingChoresCount}
            pendingApprovalsCount={dashboardProps.pendingApprovalsCount}
          />
        </div>
      </div>

      <RecentActivityPlaceholder rows={activityRows} />
    </>
  );
}
