"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

const usernameSchema = z
  .string()
  .trim()
  .min(2, "Username must be at least 2 characters")
  .max(24, "Username must be at most 24 characters");

function isSupabaseStorageUrl(url: string): boolean {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return false;
  try {
    const allowed = new URL(base).hostname;
    const parsed = new URL(url);
    return parsed.hostname === allowed && parsed.pathname.includes("/storage/");
  } catch {
    return false;
  }
}

export async function updateUsernameAction(
  formData: FormData,
): Promise<ActionResult> {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid username" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ username: parsed.data })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "Username is already taken in this house" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/", "layout");
  return { success: true };
}

export async function updateAvatarUrlAction(url: string): Promise<ActionResult> {
  if (!isSupabaseStorageUrl(url)) {
    return { success: false, error: "Invalid avatar URL" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

const preferencesSchema = z.object({
  pushNotificationsEnabled: z.boolean(),
  leaderboardVisible: z.boolean(),
});

export async function updateProfilePreferencesAction(
  pushNotificationsEnabled: boolean,
  leaderboardVisible: boolean,
): Promise<ActionResult> {
  const parsed = preferencesSchema.safeParse({
    pushNotificationsEnabled,
    leaderboardVisible,
  });
  if (!parsed.success) {
    return { success: false, error: "Invalid preferences" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("profiles")
    .update({
      push_notifications_enabled: parsed.data.pushNotificationsEnabled,
      leaderboard_visible: parsed.data.leaderboardVisible,
    })
    .eq("id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function leaveHouseAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("leave_house");

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  redirect("/onboarding");
}
