"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { parseAmountToCents } from "@/lib/money";
import type { ExpenseStrategy } from "@/lib/database.types";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createExpenseAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: t("notAuthenticated") };

  const { data: profile } = await supabase
    .from("profiles")
    .select("house_id")
    .eq("id", user.id)
    .single();

  if (!profile?.house_id) {
    return { success: false, error: t("joinHouseFirst") };
  }

  const title = String(formData.get("title") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "");
  const strategy = String(formData.get("strategy") ?? "equal") as ExpenseStrategy;
  const amountCents = parseAmountToCents(amountStr);

  if (!title) return { success: false, error: t("titleRequired") };
  if (amountCents === null || amountCents <= 0) {
    return { success: false, error: t("invalidAmount") };
  }

  const { error } = await supabase.from("expenses").insert({
    house_id: profile.house_id,
    payer_id: user.id,
    title,
    amount_cents: amountCents,
    strategy,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteExpenseAction(
  expenseId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}
