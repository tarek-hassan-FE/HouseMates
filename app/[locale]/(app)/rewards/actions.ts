"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

type RedeemErrorCode = "insufficientXp" | "invalidReward" | "generic";

export type RedeemResult =
  | { success: true }
  | { success: false; error: RedeemErrorCode };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function requireAdmin(): Promise<
  | { ok: true; houseId: string }
  | { ok: false; error: string }
> {
  const t = await getTranslations("errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id, house_role")
    .eq("id", user.id)
    .single();

  if (profile?.house_role !== "admin" || !profile.house_id) {
    return { ok: false, error: t("adminOnly") };
  }

  return { ok: true, houseId: profile.house_id };
}

function parseRewardForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description =
    String(formData.get("description") ?? "").trim() || null;
  const xpCost = Number.parseInt(String(formData.get("xp_cost") ?? "0"), 10);
  const icon = String(formData.get("icon") ?? "redeem").trim() || "redeem";
  const gradient =
    String(formData.get("gradient") ?? "").trim() || null;
  const imageUrl =
    String(formData.get("image_url") ?? "").trim() || null;
  const isEnabled = formData.get("is_enabled") === "on";
  const sortOrder = Number.parseInt(
    String(formData.get("sort_order") ?? "0"),
    10,
  );

  return {
    title,
    description,
    xp_cost: Number.isNaN(xpCost) || xpCost < 1 ? 0 : xpCost,
    icon,
    gradient,
    image_url: imageUrl,
    is_enabled: isEnabled,
    sort_order: Number.isNaN(sortOrder) ? 0 : sortOrder,
  };
}

function mapRedeemError(message: string): RedeemErrorCode {
  if (message.includes("Insufficient XP")) return "insufficientXp";
  if (message.includes("Invalid reward")) return "invalidReward";
  return "generic";
}

export async function redeemRewardAction(
  houseRewardId: string,
): Promise<RedeemResult> {
  if (!UUID_RE.test(houseRewardId)) {
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
    p_house_reward_id: houseRewardId,
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

export async function createHouseRewardAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const fields = parseRewardForm(formData);
  if (!fields.title) {
    return { success: false, error: t("titleRequired") };
  }
  if (fields.xp_cost < 1) {
    return { success: false, error: t("invalidAmount") };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("house_rewards").insert({
    house_id: admin.houseId,
    preset_key: null,
    title: fields.title,
    description: fields.description,
    xp_cost: fields.xp_cost,
    icon: fields.icon,
    gradient: fields.gradient,
    image_url: fields.image_url,
    is_enabled: fields.is_enabled,
    sort_order: fields.sort_order,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/rewards");
  return { success: true };
}

export async function updateHouseRewardAction(
  rewardId: string,
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  if (!UUID_RE.test(rewardId)) {
    return { success: false, error: t("invalidAmount") };
  }

  const fields = parseRewardForm(formData);
  if (!fields.title) {
    return { success: false, error: t("titleRequired") };
  }
  if (fields.xp_cost < 1) {
    return { success: false, error: t("invalidAmount") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("house_rewards")
    .update({
      title: fields.title,
      description: fields.description,
      xp_cost: fields.xp_cost,
      icon: fields.icon,
      gradient: fields.gradient,
      image_url: fields.image_url,
      is_enabled: fields.is_enabled,
      sort_order: fields.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .eq("house_id", admin.houseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/rewards");
  return { success: true };
}

export async function deleteHouseRewardAction(
  rewardId: string,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  if (!UUID_RE.test(rewardId)) {
    return { success: false, error: t("invalidAmount") };
  }

  const supabase = await createClient();

  const { data: reward } = await supabase
    .from("house_rewards")
    .select("preset_key")
    .eq("id", rewardId)
    .eq("house_id", admin.houseId)
    .single();

  if (!reward) {
    return { success: false, error: t("invalidAmount") };
  }

  if (reward.preset_key) {
    const { error } = await supabase
      .from("house_rewards")
      .update({ is_enabled: false, updated_at: new Date().toISOString() })
      .eq("id", rewardId)
      .eq("house_id", admin.houseId);

    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("house_rewards")
      .delete()
      .eq("id", rewardId)
      .eq("house_id", admin.houseId);

    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/rewards");
  return { success: true };
}

export async function toggleHouseRewardAction(
  rewardId: string,
  enabled: boolean,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  if (!UUID_RE.test(rewardId)) {
    return { success: false, error: t("invalidAmount") };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("house_rewards")
    .update({
      is_enabled: enabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", rewardId)
    .eq("house_id", admin.houseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/rewards");
  return { success: true };
}
