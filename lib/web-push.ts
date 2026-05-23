import webpush from "web-push";
import type { Notification } from "@/lib/database.types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PushSubscriptionRow = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type PushPayload = {
  title: string;
  body: string;
  path?: string;
  notificationId?: string;
};

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:support@roomies.app";

  if (!publicKey || !privateKey) {
    throw new Error("Missing VAPID keys");
  }

  return { publicKey, privateKey, subject };
}

export function configureWebPush() {
  const { publicKey, privateKey, subject } = getVapidConfig();
  webpush.setVapidDetails(subject, publicKey, privateKey);
}

export function buildPushPayload(notification: Notification): PushPayload {
  const payload = notification.payload as { path?: string };
  return {
    title: notification.title,
    body: notification.body,
    path: payload.path ?? "/dashboard",
    notificationId: notification.id,
  };
}

export async function sendPushToSubscription(
  subscription: PushSubscriptionRow,
  payload: PushPayload,
): Promise<void> {
  configureWebPush();

  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    },
    JSON.stringify(payload),
  );
}

export async function sendPushForNotification(
  notification: Notification,
): Promise<{ sent: number; failed: number }> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("push_notifications_enabled")
    .eq("id", notification.recipient_id)
    .single();

  if (profile?.push_notifications_enabled === false) {
    return { sent: 0, failed: 0 };
  }

  const { data: subscriptions } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth")
    .eq("user_id", notification.recipient_id);

  if (!subscriptions?.length) {
    return { sent: 0, failed: 0 };
  }

  const payload = buildPushPayload(notification);
  let sent = 0;
  let failed = 0;

  for (const sub of subscriptions as PushSubscriptionRow[]) {
    try {
      await sendPushToSubscription(sub, payload);
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
      sent += 1;
    } catch (err) {
      failed += 1;
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;

      if (statusCode === 404 || statusCode === 410) {
        await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
  }

  return { sent, failed };
}

export async function processPushOutbox(limit = 50): Promise<{
  processed: number;
  delivered: number;
  errors: number;
}> {
  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending } = await admin
    .from("push_outbox")
    .select("id, notification_id")
    .is("delivered_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (!pending?.length) {
    return { processed: 0, delivered: 0, errors: 0 };
  }

  let delivered = 0;
  let errors = 0;

  for (const row of pending) {
    const { data: notification } = await admin
      .from("notifications")
      .select(
        "id, house_id, recipient_id, actor_id, type, title, body, payload, read_at, created_at",
      )
      .eq("id", row.notification_id)
      .single();

    if (!notification) {
      await admin
        .from("push_outbox")
        .update({ delivered_at: now, last_error: "Notification not found" })
        .eq("id", row.id);
      errors += 1;
      continue;
    }

    try {
      const result = await sendPushForNotification(
        notification as Notification,
      );
      await admin
        .from("push_outbox")
        .update({
          delivered_at: now,
          last_error:
            result.sent === 0 && result.failed === 0
              ? "No active subscriptions or push disabled"
              : null,
        })
        .eq("id", row.id);
      delivered += 1;
    } catch (err) {
      errors += 1;
      await admin
        .from("push_outbox")
        .update({
          last_error: err instanceof Error ? err.message : "Push failed",
        })
        .eq("id", row.id);
    }
  }

  return { processed: pending.length, delivered, errors };
}
