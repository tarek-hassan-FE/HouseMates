"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ChoreFrequency } from "@/lib/database.types";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireAdmin(): Promise<
  | { ok: true; houseId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id, house_role")
    .eq("id", user.id)
    .single();

  if (profile?.house_role !== "admin" || !profile.house_id) {
    return { ok: false, error: "Only admins can manage chores" };
  }

  return { ok: true, houseId: profile.house_id };
}

function parseChoreForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const frequency = String(
    formData.get("frequency") ?? "weekly",
  ) as ChoreFrequency;
  const xpReward = Number.parseInt(String(formData.get("xp_reward") ?? "10"), 10);
  const assignedTo = String(formData.get("assigned_to") ?? "") || null;

  return {
    title,
    description,
    frequency,
    xp_reward: Number.isNaN(xpReward) ? 10 : xpReward,
    assigned_to: assignedTo || null,
  };
}

export async function createChoreAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const fields = parseChoreForm(formData);
  if (!fields.title) return { success: false, error: "Title is required" };

  const supabase = await createClient();
  const { error } = await supabase.from("chores").insert({
    house_id: admin.houseId,
    ...fields,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateChoreAction(
  choreId: string,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const fields = parseChoreForm(formData);
  if (!fields.title) return { success: false, error: "Title is required" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chores")
    .update(fields)
    .eq("id", choreId)
    .eq("house_id", admin.houseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteChoreAction(choreId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("chores")
    .delete()
    .eq("id", choreId)
    .eq("house_id", admin.houseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function reopenChoreAction(choreId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin.ok) return { success: false, error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase.rpc("reopen_chore", {
    p_chore_id: choreId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/chores");
  revalidatePath("/dashboard");
  return { success: true };
}
