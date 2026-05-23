#!/usr/bin/env node
/**
 * End-to-end smoke test: create notification → outbox (no browser).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvLocal() {
  const path = resolve(root, ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;
const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3000";

if (!url || !serviceKey || !cronSecret) {
  console.error("Missing env for smoke test");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: profile } = await admin
  .from("profiles")
  .select("id, house_id, username")
  .not("house_id", "is", null)
  .limit(1)
  .single();

if (!profile?.house_id) {
  console.error("No house profile found");
  process.exit(1);
}

console.log(`Profile: ${profile.username}`);

const { data: notifId, error: createErr } = await admin.rpc(
  "create_notification",
  {
    p_recipient_id: profile.id,
    p_actor_id: profile.id,
    p_house_id: profile.house_id,
    p_type: "chore_reminder",
    p_title: "Push smoke test",
    p_body: "In-app notification pipeline test.",
    p_payload: { path: "/chores" },
  },
);

if (createErr) {
  console.error("✗ create_notification:", createErr.message);
  process.exit(1);
}
console.log(`✓ Notification created: ${notifId}`);

const { data: outbox } = await admin
  .from("push_outbox")
  .select("id")
  .eq("notification_id", notifId)
  .single();

if (!outbox) {
  console.error("✗ push_outbox not enqueued");
  process.exit(1);
}
console.log("✓ push_outbox enqueued");

const { count: subCount } = await admin
  .from("push_subscriptions")
  .select("id", { count: "exact", head: true })
  .eq("user_id", profile.id);

console.log(`  Push subscriptions: ${subCount ?? 0}`);

const res = await fetch(`${baseUrl}/api/push/process-outbox`, {
  method: "POST",
  headers: { Authorization: `Bearer ${cronSecret}` },
});

const body = await res.json();
if (!res.ok) {
  console.error("✗ process-outbox HTTP", res.status, body);
  process.exit(1);
}
console.log("✓ process-outbox:", body);

const { data: outboxAfter } = await admin
  .from("push_outbox")
  .select("delivered_at, last_error")
  .eq("notification_id", notifId)
  .single();

console.log(`  delivered_at: ${outboxAfter?.delivered_at ?? "null"}`);
console.log(`  last_error: ${outboxAfter?.last_error ?? "null"}`);

if (subCount === 0) {
  console.log(
    "\nOS push not tested — enable Push notifications in Profile (browser) first.",
  );
}

console.log("\nSmoke test passed.");
