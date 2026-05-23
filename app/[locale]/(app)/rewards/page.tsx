import { RewardsPanel } from "@/components/rewards/rewards-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { HouseReward, RewardRedemption } from "@/lib/database.types";

function mapHouseReward(row: Record<string, unknown>): HouseReward {
  return {
    id: row.id as string,
    house_id: row.house_id as string,
    preset_key: (row.preset_key as string | null) ?? null,
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    xp_cost: row.xp_cost as number,
    icon: row.icon as string,
    gradient: (row.gradient as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    is_enabled: row.is_enabled as boolean,
    sort_order: row.sort_order as number,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export default async function RewardsPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  const [{ data: rewardRows }, { data: redemptionRows }] = await Promise.all([
    supabase
      .from("house_rewards")
      .select(
        "id, house_id, preset_key, title, description, xp_cost, icon, gradient, image_url, is_enabled, sort_order, created_at, updated_at",
      )
      .eq("house_id", session.house.id)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("reward_redemptions")
      .select(
        "id, house_id, profile_id, reward_key, house_reward_id, xp_spent, created_at, profile:profiles(username), house_reward:house_rewards(title)",
      )
      .eq("house_id", session.house.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const rewards: HouseReward[] = (rewardRows ?? []).map((row) =>
    mapHouseReward(row as Record<string, unknown>),
  );

  const redemptions: RewardRedemption[] = (redemptionRows ?? []).map((row) => {
    const profile = row.profile;
    const username =
      profile && typeof profile === "object" && "username" in profile
        ? (profile as { username: string }).username
        : Array.isArray(profile) && profile[0]?.username
          ? profile[0].username
          : undefined;

    const houseReward = row.house_reward;
    const rewardTitle =
      houseReward &&
      typeof houseReward === "object" &&
      "title" in houseReward
        ? (houseReward as { title: string }).title
        : Array.isArray(houseReward) && houseReward[0]?.title
          ? houseReward[0].title
          : undefined;

    return {
      id: row.id,
      house_id: row.house_id,
      profile_id: row.profile_id,
      reward_key: row.reward_key,
      house_reward_id: row.house_reward_id ?? null,
      xp_spent: row.xp_spent,
      created_at: row.created_at,
      profile: username ? { username } : null,
      house_reward: rewardTitle ? { title: rewardTitle } : null,
    };
  });

  return (
    <RewardsPanel
      totalXp={session.profile.total_xp}
      rewards={rewards}
      redemptions={redemptions}
      isAdmin={session.isAdmin}
    />
  );
}
