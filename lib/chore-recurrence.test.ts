import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isChoreActive,
  isChoreCompletedDisplay,
  isChoreInCooldown,
  isRecurringFrequency,
} from "./chore-recurrence.ts";

const future = new Date(Date.now() + 86_400_000).toISOString();
const past = new Date(Date.now() - 86_400_000).toISOString();

describe("chore-recurrence", () => {
  it("treats uncompleted chores as active", () => {
    assert.equal(
      isChoreActive({
        last_completed_at: null,
        frequency: "weekly",
        reactivates_at: null,
      }),
      true,
    );
  });

  it("treats once chores as inactive after completion", () => {
    assert.equal(
      isChoreActive({
        last_completed_at: past,
        frequency: "once",
        reactivates_at: null,
      }),
      false,
    );
    assert.equal(
      isChoreCompletedDisplay({
        last_completed_at: past,
        frequency: "once",
        reactivates_at: null,
      }),
      true,
    );
  });

  it("puts recurring chores in cooldown until reactivates_at", () => {
    const chore = {
      last_completed_at: past,
      frequency: "daily" as const,
      reactivates_at: future,
    };
    assert.equal(isChoreInCooldown(chore), true);
    assert.equal(isChoreActive(chore), false);
    assert.equal(isChoreCompletedDisplay(chore), true);
  });

  it("treats recurring chores as active when reactivates_at has passed", () => {
    const chore = {
      last_completed_at: past,
      frequency: "weekly" as const,
      reactivates_at: past,
    };
    assert.equal(isChoreInCooldown(chore), false);
    assert.equal(isChoreActive(chore), true);
    assert.equal(isChoreCompletedDisplay(chore), false);
  });

  it("identifies recurring frequencies", () => {
    assert.equal(isRecurringFrequency("daily"), true);
    assert.equal(isRecurringFrequency("once"), false);
  });
});
