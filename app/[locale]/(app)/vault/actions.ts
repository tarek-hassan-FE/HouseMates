"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  parseVaultData,
  type HouseVaultData,
} from "@/lib/vault/types";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

async function requireHouseUser() {
  const t = await getTranslations("errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: t("notAuthenticated") as string, supabase, user: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id, house_role")
    .eq("id", user.id)
    .single();

  if (!profile?.house_id) {
    return { error: t("joinHouseFirst") as string, supabase, user: null };
  }

  return {
    error: null,
    supabase,
    user,
    houseId: profile.house_id,
    isAdmin: profile.house_role === "admin",
  };
}

export async function markVaultIntroSeenAction(): Promise<ActionResult> {
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { error } = await session.supabase
    .from("profiles")
    .update({ vault_intro_seen: true })
    .eq("id", session.user!.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/vault");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateVaultDataAction(
  patch: HouseVaultData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };
  if (!session.isAdmin) return { success: false, error: t("adminOnly") as string };

  const { data: house } = await session.supabase
    .from("houses")
    .select("vault_data")
    .eq("id", session.houseId)
    .single();

  const current = parseVaultData(house?.vault_data);
  const merged: HouseVaultData = {
    ...current,
    ...patch,
  };

  const { error } = await session.supabase
    .from("houses")
    .update({ vault_data: merged })
    .eq("id", session.houseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/vault");
  return { success: true };
}
