import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  choreReminderPeriodKey,
  isChoreReminderDue,
} from "./chore-reminder-period.ts";

describe("chore-reminder-period", () => {
  it("daily active chore is due any day", () => {
    assert.equal(
      isChoreReminderDue({
        frequency: "daily",
        createdAt: new Date("2025-05-01T12:00:00Z"),
        reactivatesAt: null,
        lastCompletedAt: null,
        now: new Date("2025-05-07T09:00:00Z"),
      }),
      true,
    );
  });

  it("weekly chore due only on anchor weekday", () => {
    const created = new Date("2025-05-07T12:00:00Z");
    assert.equal(
      isChoreReminderDue({
        frequency: "weekly",
        createdAt: created,
        reactivatesAt: null,
        lastCompletedAt: null,
        now: new Date("2025-05-14T09:00:00Z"),
      }),
      true,
    );
    assert.equal(
      isChoreReminderDue({
        frequency: "weekly",
        createdAt: created,
        reactivatesAt: null,
        lastCompletedAt: null,
        now: new Date("2025-05-15T09:00:00Z"),
      }),
      false,
    );
  });

  it("skips chore in cooldown", () => {
    assert.equal(
      isChoreReminderDue({
        frequency: "daily",
        createdAt: new Date("2025-05-01T12:00:00Z"),
        reactivatesAt: new Date("2025-05-10T00:00:00Z"),
        lastCompletedAt: new Date("2025-05-09T15:00:00Z"),
        now: new Date("2025-05-09T20:00:00Z"),
      }),
      false,
    );
  });

  it("builds stable period keys", () => {
    const now = new Date("2025-05-14T09:00:00Z");
    assert.equal(choreReminderPeriodKey("daily", now), "2025-4-14");
    assert.match(choreReminderPeriodKey("weekly", now), /^w-/);
  });
});
