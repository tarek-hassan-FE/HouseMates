import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  allDebtorsOnCooldown,
  eligibleDebtorIds,
  paymentReminderCooldowns,
} from "./payment-reminder-cooldown.ts";

describe("payment-reminder-cooldown", () => {
  const actorId = "alice";
  const bob = "bob";
  const now = new Date("2025-06-01T12:00:00Z").getTime();

  it("detects debtors within 24h cooldown", () => {
    const cooldowns = paymentReminderCooldowns(
      [
        {
          recipient_id: bob,
          actor_id: actorId,
          type: "payment_reminder",
          created_at: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
        },
      ],
      actorId,
      now,
    );
    assert.equal(cooldowns.length, 1);
    assert.equal(cooldowns[0].debtorId, bob);
  });

  it("eligibleDebtorIds excludes cooled-down debtors", () => {
    const cooldowns = paymentReminderCooldowns(
      [
        {
          recipient_id: bob,
          actor_id: actorId,
          type: "payment_reminder",
          created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      actorId,
      now,
    );
    assert.deepEqual(eligibleDebtorIds([bob, "carol"], cooldowns), ["carol"]);
  });

  it("allDebtorsOnCooldown when every debtor is cooled", () => {
    const cooldowns = paymentReminderCooldowns(
      [
        {
          recipient_id: bob,
          actor_id: actorId,
          type: "payment_reminder",
          created_at: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        },
      ],
      actorId,
      now,
    );
    assert.equal(allDebtorsOnCooldown([bob], cooldowns), true);
    assert.equal(allDebtorsOnCooldown([bob], []), false);
  });
});
