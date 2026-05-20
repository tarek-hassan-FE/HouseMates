"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChoreFrequency } from "@/lib/database.types";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createChoreAction(
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id, house_role")
    .eq("id", user.id)
    .single();

  if (profile?.house_role !== "admin" || !profile.house_id) {
    return { success: false, error: "Only admins can create chores" };
  }

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const frequency = String(
    formData.get("frequency") ?? "weekly",
  ) as ChoreFrequency;
  const xpReward = Number.parseInt(String(formData.get("xp_reward") ?? "10"), 10);
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;

  const { error } = await supabase.from("chores").insert({
    house_id: profile.house_id,
    title,
    description,
    frequency,
    xp_reward: Number.isNaN(xpReward) ? 10 : xpReward,
    assigned_to: assignedTo || null,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteChoreAction(choreId: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("chores").delete().eq("id", choreId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}
