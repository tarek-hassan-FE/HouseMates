import { getTranslations } from "next-intl/server";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireHouseSession } from "@/lib/auth/session";
import {
  buildDebtsByExpenseMap,
  mapChoreCompletionsToActivity,
  mapExpensesToActivity,
  mergeProfileActivity,
} from "@/lib/profile/activity";
import {
  computeHouseRank,
  computeXpTier,
  financialReliabilityPercent,
  isTopPercentRank,
} from "@/lib/profile/stats";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const t = await getTranslations("profile");
  const houseId = session.house.id;
  const userId = session.userId;

  const [
    { count: choresCompleted },
    { data: members },
    { data: choreActivities },
    { data: userExpenses },
    { data: debtorDebts },
    { data: expenseDebts },
  ] = await Promise.all([
    supabase
      .from("chore_completions")
      .select("id", { count: "exact", head: true })
      .eq("house_id", houseId)
      .eq("submitted_by", userId)
      .eq("status", "approved"),
    supabase
      .from("profiles")
      .select("id, total_xp")
      .eq("house_id", houseId),
    supabase
      .from("chore_completions")
      .select(
        "id, xp_reward, reviewed_at, chores!inner(title)",
      )
      .eq("house_id", houseId)
      .eq("submitted_by", userId)
      .eq("status", "approved")
      .not("reviewed_at", "is", null)
      .order("reviewed_at", { ascending: false })
      .limit(10),
    supabase
      .from("expenses")
      .select("id, title, created_at")
      .eq("house_id", houseId)
      .eq("payer_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("debt_ledger")
      .select("settled_at")
      .eq("house_id", houseId)
      .eq("debtor_id", userId),
    supabase
      .from("debt_ledger")
      .select("expense_id, settled_at")
      .eq("house_id", houseId)
      .not("expense_id", "is", null),
  ]);

  const memberList = members ?? [];
  const memberCount = memberList.length;
  const rank = computeHouseRank(memberList, userId);
  const xpTier = computeXpTier(rank, memberCount);
  const topPercent = isTopPercentRank(rank, memberCount);
  const reliability = financialReliabilityPercent(debtorDebts ?? []);

  const expenseIds = (userExpenses ?? []).map((e) => e.id);
  const debtsForUserExpenses = (expenseDebts ?? []).filter(
    (d) => d.expense_id && expenseIds.includes(d.expense_id),
  );
  const debtsByExpense = buildDebtsByExpenseMap(debtsForUserExpenses);

  const activity = mergeProfileActivity(
    mapChoreCompletionsToActivity(choreActivities ?? []),
    mapExpensesToActivity(userExpenses ?? [], debtsByExpense),
  );

  return (
    <>
      <header className="mb-6">
        <h1 className="text-headline-lg text-on-surface">{t("title")}</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          {t("subtitle")}
        </p>
      </header>
      <ProfilePanel
        userId={userId}
        profile={{
          username: session.profile.username,
          avatar_url: session.profile.avatar_url,
          total_xp: session.profile.total_xp,
          current_level: session.profile.current_level,
          house_role: session.profile.house_role,
          created_at: session.profile.created_at,
          push_notifications_enabled:
            session.profile.push_notifications_enabled ?? false,
          leaderboard_visible: session.profile.leaderboard_visible ?? true,
        }}
        stats={{
          choresCompleted: choresCompleted ?? 0,
          totalXp: session.profile.total_xp,
          financialReliability: reliability,
          rank,
          memberCount,
          topPercent,
          xpTier,
        }}
        activity={activity}
      />
    </>
  );
}
