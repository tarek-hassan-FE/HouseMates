"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { parseAmountToCents } from "@/lib/money";
import type { ExpenseStrategy } from "@/lib/database.types";
import { parseShareFieldsFromFormData, validateExactShares } from "@/lib/split-exact";
import type { ExactSplitValidationError } from "@/lib/split-exact-validate";

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

function parseExpenseForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const amountStr = String(formData.get("amount") ?? "");
  const amountCents = parseAmountToCents(amountStr);
  return { title, amountCents };
}

async function errorMessageForSplit(
  code: ExactSplitValidationError,
): Promise<string> {
  const t = await getTranslations("errors");
  return t(code);
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
  } else if (strategy === "exact") {
    const { data: members } = await session.supabase
      .from("profiles")
      .select("id")
      .eq("house_id", session.houseId);

    const memberIds = (members ?? []).map((m) => m.id);
    const shareStrings = parseShareFieldsFromFormData(formData, memberIds);
    const validation = validateExactShares(
      shareStrings,
      memberIds,
      amountCents,
      session.user!.id,
    );

    if (!validation.ok) {
      return {
        success: false,
        error: await errorMessageForSplit(validation.error),
      };
    }

    const { error } = await session.supabase.rpc(
      "create_expense_with_exact_split",
      {
        p_title: title,
        p_amount_cents: amountCents,
        p_shares: validation.shares,
      },
    );
    if (error) return { success: false, error: error.message };
  } else {
    return { success: false, error: t("invalidAmount") };
  }

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

export async function settleBilateralDebtsAction(
  otherUserId: string,
): Promise<ActionResult> {
  const session = await requireHouseUser();
  if (session.error) return { success: false, error: session.error };

  const { error } = await session.supabase.rpc("settle_bilateral_debts", {
    p_other_user_id: otherUserId,
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
