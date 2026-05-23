#!/usr/bin/env node
/**
 * Validates Web Push env + Supabase schema without printing secrets.
 * Usage: node scripts/validate-push-setup.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";

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

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY",
  "VAPID_SUBJECT",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
];

const publishable =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let failed = 0;

function ok(msg) {
  console.log(`✓ ${msg}`);
}

function fail(msg) {
  console.error(`✗ ${msg}`);
  failed += 1;
}

console.log("Web Push setup validation\n");

for (const key of required) {
  if (process.env[key]?.trim()) ok(`${key} is set`);
  else fail(`${key} is missing`);
}

if (publishable?.trim()) ok("Supabase publishable/anon key is set");
else fail("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or ANON key is missing");

try {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? "mailto:test@test.com",
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    process.env.VAPID_PRIVATE_KEY ?? "",
  );
  ok("VAPID keys are valid (web-push accepted them)");
} catch (e) {
  fail(`VAPID keys invalid: ${e instanceof Error ? e.message : e}`);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (url && serviceKey) {
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const table of ["push_subscriptions", "push_outbox", "notifications"]) {
    const { error } = await admin.from(table).select("id").limit(1);
    if (error) fail(`Table "${table}": ${error.message}`);
    else ok(`Table "${table}" exists and is readable`);
  }

  const { data: enumCheck, error: rpcErr } = await admin.rpc(
    "send_chore_reminders",
  );
  if (rpcErr) fail(`send_chore_reminders RPC: ${rpcErr.message}`);
  else ok(`send_chore_reminders RPC works (sent ${dataCount(enumCheck)} reminders)`);

  const { count: outboxPending } = await admin
    .from("push_outbox")
    .select("id", { count: "exact", head: true })
    .is("delivered_at", null);

  ok(`Push outbox pending: ${outboxPending ?? 0} row(s)`);
}

console.log("");
if (failed > 0) {
  console.error(`${failed} check(s) failed. Fix issues before deploy.`);
  process.exit(1);
}

console.log("All checks passed.");
console.log(
  "\nNext: start dev server, enable push in Profile, trigger an event (assign chore), then:",
);
console.log(
  "  curl -H \"Authorization: Bearer $CRON_SECRET\" http://localhost:3000/api/push/process-outbox",
);

function dataCount(val) {
  if (typeof val === "number") return val;
  return 0;
}
