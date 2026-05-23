import type { Chore, ChoreFrequency } from "@/lib/database.types";

type ChoreRecurrenceFields = Pick<
  Chore,
  "last_completed_at" | "frequency" | "reactivates_at"
>;

/** Chore is actionable (not in post-completion cooldown). */
export function isChoreActive(chore: ChoreRecurrenceFields): boolean {
  if (!chore.last_completed_at) return true;
  if (chore.frequency === "once") return false;
  if (chore.reactivates_at) {
    return new Date(chore.reactivates_at) <= new Date();
  }
  return false;
}

/** Recurring chore waiting for next calendar period. */
export function isChoreInCooldown(chore: ChoreRecurrenceFields): boolean {
  if (!chore.last_completed_at || chore.frequency === "once") return false;
  if (!chore.reactivates_at) return false;
  return new Date(chore.reactivates_at) > new Date();
}

/** Shown in the completed / cooldown section. */
export function isChoreCompletedDisplay(chore: ChoreRecurrenceFields): boolean {
  if (!chore.last_completed_at) return false;
  if (chore.frequency === "once") return true;
  if (isChoreInCooldown(chore)) return true;
  if (!chore.reactivates_at) return true;
  return false;
}

export function isRecurringFrequency(
  frequency: ChoreFrequency,
): frequency is Exclude<ChoreFrequency, "once"> {
  return frequency !== "once";
}
