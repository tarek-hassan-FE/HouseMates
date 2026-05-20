import { RewardsPanel } from "@/components/rewards/rewards-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { RewardRedemption } from "@/lib/database.types";

export default async function RewardsPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("reward_redemptions")
    .select(
      "id, house_id, profile_id, reward_key, xp_spent, created_at, profile:profiles(username)",
    )
    .eq("house_id", session.house.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const redemptions: RewardRedemption[] = (rows ?? []).map((row) => {
    const profile = row.profile;
    const username =
      profile && typeof profile === "object" && "username" in profile
        ? (profile as { username: string }).username
        : Array.isArray(profile) && profile[0]?.username
          ? profile[0].username
          : undefined;
    return {
      id: row.id,
      house_id: row.house_id,
      profile_id: row.profile_id,
      reward_key: row.reward_key,
      xp_spent: row.xp_spent,
      created_at: row.created_at,
      profile: username ? { username } : null,
    };
  });

  return (
    <RewardsPanel
      totalXp={session.profile.total_xp}
      redemptions={redemptions}
    />
  );
}
