"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { parseAmountToCents } from "@/lib/money";
import type { ExpenseStrategy } from "@/lib/database.types";

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

  return { error: null, supabase, user };
}

function parseExpenseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "");
  const amountCents = parseAmountToCents(amountStr);
  return { title, amountCents };
}

export async function createExpenseAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { title, amountCents } = parseExpenseForm(formData);
  const strategy = String(formData.get("strategy") ?? "equal") as ExpenseStrategy;

  if (!title) return { success: false, error: t("titleRequired") };
  if (amountCents === null || amountCents <= 0) {
    return { success: false, error: t("invalidAmount") };
  }

  if (strategy === "equal") {
    const { error } = await session.supabase.rpc(
      "create_expense_with_equal_split",
      {
        p_title: title,
        p_amount_cents: amountCents,
      },
    );
    if (error) return { success: false, error: error.message };
  } else {
    const { data: profile } = await session.supabase
      .from("profiles")
      .select("house_id")
      .eq("id", session.user!.id)
      .single();
    const { error } = await session.supabase.from("expenses").insert({
      house_id: profile!.house_id,
      payer_id: session.user!.id,
      title,
      amount_cents: amountCents,
      strategy,
    });
    if (error) return { success: false, error: error.message };
  }

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function createShoppingItemAction(
  formData: FormData,
): Promise<ActionResult> {
  const t = await getTranslations("errors");
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { title, amountCents } = parseExpenseForm(formData);

  if (!title) return { success: false, error: t("titleRequired") };
  if (amountCents === null || amountCents <= 0) {
    return { success: false, error: t("invalidAmount") };
  }

  const { error } = await session.supabase.rpc(
    "create_expense_with_equal_split",
    {
      p_title: title,
      p_amount_cents: amountCents,
    },
  );

  if (error) return { success: false, error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function settleExpenseAction(
  expenseId: string,
): Promise<ActionResult> {
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { error } = await session.supabase.rpc("settle_expense_debts", {
    p_expense_id: expenseId,
  });
  if (error) return { success: false, error: error.message };

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function settleAllDebtsAction(): Promise<ActionResult> {
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { error } = await session.supabase.rpc("settle_all_house_debts");
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
