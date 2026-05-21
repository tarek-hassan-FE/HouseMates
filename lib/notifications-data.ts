import type { Notification } from "@/lib/database.types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function fetchNotificationsForUser(
  supabase: SupabaseClient,
  userId: string,
  _houseId: string,
  limit = 50,
): Promise<Notification[]> {
  const { data } = await supabase
    .from("notifications")
    .select(
      "id, house_id, recipient_id, actor_id, type, title, body, payload, read_at, created_at",
    )
    .eq("recipient_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as Notification[];
}

export async function fetchUnreadNotificationCount(
  supabase: SupabaseClient,
  userId: string,
  _houseId: string,
): Promise<number> {
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);

  return count ?? 0;
}

/** Recent payment reminders sent by this user (for cooldown UI). */
export async function fetchPaymentRemindersSentByActor(
  supabase: SupabaseClient,
  actorId: string,
): Promise<Pick<Notification, "recipient_id" | "created_at" | "type" | "actor_id">[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("notifications")
    .select("recipient_id, created_at, type, actor_id")
    .eq("actor_id", actorId)
    .eq("type", "payment_reminder")
    .gte("created_at", since);

  return (data ?? []) as Pick<
    Notification,
    "recipient_id" | "created_at" | "type" | "actor_id"
  >[];
}
