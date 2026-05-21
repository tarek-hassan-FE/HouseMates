"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export type SendPaymentRemindersResult =
  | {
      success: true;
      notifiedCount: number;
      skippedCount: number;
    }
  | { success: false; error: string };

function mapReminderError(message: string, t: (key: string) => string): string {
  if (message.includes("No outstanding balances owed to you")) {
    return t("noDebtorsToRemind");
  }
  if (message.includes("All reminders on cooldown")) {
    return t("allRemindersOnCooldown");
  }
  return message;
}

export async function sendPaymentRemindersAction(): Promise<SendPaymentRemindersResult> {
  const t = await getTranslations("ledger");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: t("remindNotAuthenticated") };
  }

  const { data, error } = await supabase.rpc("send_payment_reminders");

  if (error) {
    return {
      success: false,
      error: mapReminderError(error.message, t),
    };
  }

  const result = data as {
    notified_count?: number;
    skipped?: unknown[];
  } | null;

  revalidatePath("/ledger");
  revalidatePath("/dashboard");
  revalidatePath("/", "layout");

  return {
    success: true,
    notifiedCount: result?.notified_count ?? 0,
    skippedCount: Array.isArray(result?.skipped) ? result.skipped.length : 0,
  };
}

export async function markNotificationsReadAction(
  ids: string[],
): Promise<ActionResult> {
  if (ids.length === 0) return { success: true };

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notifications_read", {
    p_ids: ids,
  });

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}

export async function markAllNotificationsReadAction(): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_all_notifications_read");

  if (error) return { success: false, error: error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
