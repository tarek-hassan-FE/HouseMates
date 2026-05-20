import { getTranslations } from "next-intl/server";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { LeaderboardPodium } from "@/components/dashboard/leaderboard-podium";
import { FinanceStatusCard } from "@/components/dashboard/finance-status-card";
import { QuickActionGrid } from "@/components/dashboard/quick-action-grid";
import { RecentActivityPlaceholder } from "@/components/dashboard/recent-activity-placeholder";

export default async function DashboardPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const t = await getTranslations("dashboard");

  const [{ data: leaderboard }, { data: chores }, { data: debts }] =
    await Promise.all([
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
        .select("amount_cents, debtor_id, creditor_id")
        .eq("house_id", session.house.id),
    ]);

  const myDebts = (debts ?? []).filter((d) => d.debtor_id === session.userId);
  const iOwe = myDebts.reduce((s, d) => s + d.amount_cents, 0);

  const entries = (leaderboard ?? []).map((m) => ({
    username: m.username,
    total_xp: m.total_xp,
    avatar_url: m.avatar_url,
  }));

  const pendingChores = (chores ?? []).length;
  const leader = entries[0];

  const activityRows = entries.slice(0, 2).map((mate, i) =>
    i === 0
      ? {
          username: mate.username,
          avatar_url: mate.avatar_url,
          time: t("hoursAgo", { count: 2 }),
          type: "chore" as const,
          xp: 25,
        }
      : {
          username: mate.username,
          avatar_url: mate.avatar_url,
          time: t("hoursAgo", { count: 5 }),
          type: "shopping" as const,
        },
  );

  return (
    <>
      <LeaderboardPodium
        entries={entries}
        leaderName={leader?.username}
      />

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
        <div className="flex flex-col lg:col-span-5">
          <FinanceStatusCard youOweCents={iOwe} />
        </div>
        <div className="lg:col-span-7">
          <QuickActionGrid pendingChoresCount={pendingChores} />
        </div>
      </div>

      {activityRows.length > 0 && (
        <RecentActivityPlaceholder rows={activityRows} />
      )}
    </>
  );
}
