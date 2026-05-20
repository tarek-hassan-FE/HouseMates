"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isValidRewardKey } from "@/lib/rewards-catalog";

export type RedeemErrorCode = "insufficientXp" | "invalidReward" | "generic";

export type RedeemResult =
  | { success: true }
  | { success: false; error: RedeemErrorCode };

function mapRedeemError(message: string): RedeemErrorCode {
  if (message.includes("Insufficient XP")) return "insufficientXp";
  if (message.includes("Invalid reward")) return "invalidReward";
  return "generic";
}

export async function redeemRewardAction(
  rewardKey: string,
): Promise<RedeemResult> {
  if (!isValidRewardKey(rewardKey)) {
    return { success: false, error: "invalidReward" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "generic" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id")
    .eq("id", user.id)
    .single();

  if (!profile?.house_id) {
    return { success: false, error: "generic" };
  }

  const { error } = await supabase.rpc("redeem_reward", {
    p_reward_key: rewardKey,
  });

  if (error) {
    const code = mapRedeemError(error.message);
    if (code === "generic") {
      console.error("redeem_reward failed:", error.message);
    }
    return { success: false, error: code };
  }

  revalidatePath("/rewards");
  revalidatePath("/chores");
  revalidatePath("/dashboard");

  return { success: true };
}
