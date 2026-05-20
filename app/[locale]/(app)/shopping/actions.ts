"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { parseAmountToCents } from "@/lib/money";

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
    .select("house_id")
    .eq("id", user.id)
    .single();

  if (!profile?.house_id) {
    return { error: t("joinHouseFirst") as string, supabase, user: null };
  }

  return { error: null, supabase, user, houseId: profile.house_id };
}

export async function addShoppingListItemAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { success: false, error: t("titleRequired") };

  const { error } = await session.supabase.from("shopping_list_items").insert({
    house_id: session.houseId,
    title,
    created_by: session.user!.id,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/shopping");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeShoppingListItemAction(
  id: string,
): Promise<ActionResult> {
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { error } = await session.supabase
    .from("shopping_list_items")
    .delete()
    .eq("id", id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/shopping");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createShoppingItemAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const listItemIdRaw = String(formData.get("listItemId") ?? "").trim();
  const listItemId =
    listItemIdRaw && listItemIdRaw !== "__other__" ? listItemIdRaw : null;
  const title = String(formData.get("title") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "");
  const amountCents = parseAmountToCents(amountStr);

  if (!listItemId && !title) {
    return { success: false, error: t("titleRequired") };
  }
  if (amountCents === null || amountCents <= 0) {
    return { success: false, error: t("invalidAmount") };
  }

  const { error } = await session.supabase.rpc("purchase_shopping_item", {
    p_list_item_id: listItemId,
    p_title: title,
    p_amount_cents: amountCents,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/shopping");
  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}
