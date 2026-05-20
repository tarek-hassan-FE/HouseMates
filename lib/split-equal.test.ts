import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  splitEqualAmongMembers,
  totalDebtCents,
} from "./split-equal.ts";

describe("splitEqualAmongMembers", () => {
  const members = ["a", "b", "c"];

  it("returns no debts for a single member", () => {
    assert.deepEqual(
      splitEqualAmongMembers(100, ["a"], "a"),
      [],
    );
  });

  it("splits 100 among 3 members with remainder 1", () => {
    const debts = splitEqualAmongMembers(100, members, "a");
    assert.equal(debts.length, 2);
    assert.deepEqual(
      debts.sort((x, y) => x.debtorId.localeCompare(y.debtorId)),
      [
        { debtorId: "b", amountCents: 34 },
        { debtorId: "c", amountCents: 33 },
      ],
    );
    assert.equal(totalDebtCents(debts), 67);
  });

  it("splits 90 evenly among 3 members", () => {
    const debts = splitEqualAmongMembers(90, members, "a");
    assert.equal(debts.length, 2);
    assert.equal(debts[0].amountCents, 30);
    assert.equal(debts[1].amountCents, 30);
    assert.equal(totalDebtCents(debts), 60);
  });

  it("excludes payer from debtors", () => {
    const debts = splitEqualAmongMembers(100, members, "b");
    assert.deepEqual(
      debts.map((d) => d.debtorId).sort(),
      ["a", "c"],
    );
  });
});
