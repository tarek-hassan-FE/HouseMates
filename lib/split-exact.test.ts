import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateExactShares } from "./split-exact-validate.ts";
import { equalSharesAmongMembers, totalDebtCents } from "./split-equal.ts";

describe("equalSharesAmongMembers", () => {
  it("sums to total for three members", () => {
    const shares = equalSharesAmongMembers(100, ["a", "b", "c"], "a");
    const sum = Object.values(shares).reduce((s, v) => s + v, 0);
    assert.equal(sum, 100);
    assert.ok(shares.a > 0);
  });
});

describe("validateExactShares", () => {
  const members = ["a", "b", "c"];
  const payerId = "a";

  it("accepts valid shares summing to total", () => {
    const result = validateExactShares(
      { a: "33.34", b: "33.33", c: "33.33" },
      members,
      10000,
      payerId,
    );
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.shares.length, 3);
      assert.equal(
        result.shares.reduce((s, x) => s + x.amount_cents, 0),
        10000,
      );
    }
  });

  it("rejects sum mismatch", () => {
    const result = validateExactShares(
      { a: "60", b: "25", c: "25" },
      members,
      10000,
      payerId,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "splitMustEqualTotal");
  });

  it("rejects invalid share", () => {
    const result = validateExactShares(
      { a: "x", b: "50", c: "50" },
      members,
      10000,
      payerId,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "splitInvalidShare");
  });

  it("allows payer zero share when others owe", () => {
    const result = validateExactShares(
      { a: "0", b: "50", c: "50" },
      members,
      10000,
      payerId,
    );
    assert.equal(result.ok, true);
  });

  it("rejects when no non-payer has positive share", () => {
    const result = validateExactShares(
      { a: "100", b: "0", c: "0" },
      members,
      10000,
      payerId,
    );
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error, "splitSharesRequired");
  });
});

describe("equal split consistency", () => {
  it("equal shares match debt total", () => {
    const amount = 90;
    const members = ["a", "b", "c"];
    const shares = equalSharesAmongMembers(amount, members, "a");
    const sum = Object.values(shares).reduce((s, v) => s + v, 0);
    assert.equal(sum, amount);
    const payerShare = shares.a;
    const debtTotal = amount - payerShare;
    assert.equal(
      debtTotal,
      totalDebtCents(
        Object.entries(shares)
          .filter(([id]) => id !== "a")
          .map(([debtorId, amountCents]) => ({ debtorId, amountCents })),
      ),
    );
  });
});
