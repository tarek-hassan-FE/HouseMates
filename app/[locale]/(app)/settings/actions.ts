"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true; inviteCode?: string }
  | { success: false; error: string };

export async function updateHouseNameAction(
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_house_name", { p_name: name });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function regenerateInviteAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("regenerate_invite_code");

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true, inviteCode: data as string };
}

export async function removeMemberAction(
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("remove_house_member", {
    p_user_id: userId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function transferAdminAction(
  userId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_house_admin", {
    p_user_id: userId,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
