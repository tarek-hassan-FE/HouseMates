import type { Notification } from "@/lib/database.types";

export type ReminderCooldownEntry = {
  debtorId: string;
  nextRemindAt: string;
};

/** Debtors the actor reminded within the last 24 hours. */
export function paymentReminderCooldowns(
  notifications: Pick<Notification, "recipient_id" | "created_at" | "type" | "actor_id">[],
  actorId: string,
  nowMs = Date.now(),
): ReminderCooldownEntry[] {
  const cooldownMs = 24 * 60 * 60 * 1000;
  const byDebtor = new Map<string, number>();

  for (const n of notifications) {
    if (n.type !== "payment_reminder" || n.actor_id !== actorId) continue;
    const created = new Date(n.created_at).getTime();
    if (nowMs - created >= cooldownMs) continue;
    const nextAt = created + cooldownMs;
    const existing = byDebtor.get(n.recipient_id);
    if (existing == null || nextAt > existing) {
      byDebtor.set(n.recipient_id, nextAt);
    }
  }

  return [...byDebtor.entries()].map(([debtorId, nextMs]) => ({
    debtorId,
    nextRemindAt: new Date(nextMs).toISOString(),
  }));
}

export function eligibleDebtorIds(
  debtorIds: string[],
  cooldowns: ReminderCooldownEntry[],
): string[] {
  const cooled = new Set(cooldowns.map((c) => c.debtorId));
  return debtorIds.filter((id) => !cooled.has(id));
}

export function allDebtorsOnCooldown(
  debtorIds: string[],
  cooldowns: ReminderCooldownEntry[],
): boolean {
  return debtorIds.length > 0 && eligibleDebtorIds(debtorIds, cooldowns).length === 0;
}
