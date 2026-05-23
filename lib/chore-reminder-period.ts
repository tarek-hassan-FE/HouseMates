import type { ChoreFrequency } from "@/lib/database.types";

export type ChoreReminderInput = {
  frequency: ChoreFrequency;
  createdAt: Date;
  reactivatesAt: Date | null;
  lastCompletedAt: Date | null;
  now?: Date;
};

/** Mirrors SQL should_send_chore_reminder calendar alignment (UTC). */
export function isChoreReminderDue(input: ChoreReminderInput): boolean {
  const now = input.now ?? new Date();

  if (input.frequency === "once") return false;

  if (
    input.lastCompletedAt &&
    (!input.reactivatesAt || input.reactivatesAt > now)
  ) {
    return false;
  }

  const anchor = input.reactivatesAt ?? input.createdAt;
  const anchorDow = anchor.getUTCDay() === 0 ? 7 : anchor.getUTCDay();
  const nowDow = now.getUTCDay() === 0 ? 7 : now.getUTCDay();

  switch (input.frequency) {
    case "daily":
      break;
    case "weekly":
      if (nowDow !== anchorDow) return false;
      break;
    case "biweekly": {
      if (nowDow !== anchorDow) return false;
      const weeksSince = Math.floor(
        (now.getTime() - anchor.getTime()) / (7 * 24 * 60 * 60 * 1000),
      );
      if (weeksSince % 2 !== 0) return false;
      break;
    }
    case "monthly":
      if (now.getUTCDate() !== anchor.getUTCDate()) return false;
      break;
    default:
      return false;
  }

  return true;
}

export function choreReminderPeriodKey(
  frequency: ChoreFrequency,
  now: Date,
): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();

  switch (frequency) {
    case "daily":
      return `${y}-${m}-${d}`;
    case "weekly": {
      const weekStart = new Date(Date.UTC(y, m, d - ((now.getUTCDay() + 6) % 7)));
      return `w-${weekStart.toISOString().slice(0, 10)}`;
    }
    case "biweekly": {
      const weekStart = new Date(Date.UTC(y, m, d - ((now.getUTCDay() + 6) % 7)));
      return `bw-${weekStart.toISOString().slice(0, 10)}`;
    }
    case "monthly":
      return `${y}-${m}`;
    default:
      return "once";
  }
}
