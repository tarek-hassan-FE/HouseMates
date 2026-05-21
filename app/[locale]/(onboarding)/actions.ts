"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { mapPlatformErrorMessage } from "@/lib/platform/capacity";
import { createClient } from "@/lib/supabase/server";

export type OnboardingActionResult =
  | { success: true; inviteCode?: string }
  | { success: false; error: string };

async function resolveOnboardingError(message: string): Promise<string> {
  const key = mapPlatformErrorMessage(message);
  if (key === "betaHouseLimit") {
    const t = await getTranslations("onboarding");
    return t("betaHouseLimitError");
  }
  return message;
}

export async function createHouseAction(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const name = String(formData.get("houseName") ?? "").trim();
  if (!name) {
    return { success: false, error: "House name is required" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_house", { p_name: name });

  if (error) {
    return { success: false, error: await resolveOnboardingError(error.message) };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const inviteCode = row?.invite_code as string | undefined;

  revalidatePath("/", "layout");
  return { success: true, inviteCode };
}

export async function joinHouseAction(
  formData: FormData,
): Promise<OnboardingActionResult> {
  const code = String(formData.get("inviteCode") ?? "")
    .trim()
    .toUpperCase();
  if (!code) {
    return { success: false, error: "Invite code is required" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("join_house", { p_invite_code: code });

  if (error) {
    return { success: false, error: await resolveOnboardingError(error.message) };
  }

  revalidatePath("/", "layout");
  return { success: true };
}
