import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildDebtRows,
  expenseSettlementStatus,
  filterExpensesByStatus,
  filterUnsettled,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
  type DebtForBalance,
} from "./ledger-balances.ts";

function debt(
  overrides: Partial<DebtForBalance> & Pick<DebtForBalance, "debtor_id" | "creditor_id" | "amount_cents">,
): DebtForBalance {
  return {
    id: "d1",
    expense_id: "e1",
    settled_at: null,
    ...overrides,
  };
}

describe("ledger-balances", () => {
  const userId = "alice";
  const bob = "bob";

  it("sums only unsettled debts", () => {
    const debts = [
      debt({ debtor_id: userId, creditor_id: bob, amount_cents: 50 }),
      debt({
        debtor_id: userId,
        creditor_id: bob,
        amount_cents: 20,
        settled_at: "2025-01-01T00:00:00Z",
      }),
      debt({ debtor_id: bob, creditor_id: userId, amount_cents: 30 }),
    ];
    assert.equal(sumYouOweCents(debts, userId), 50);
    assert.equal(sumYoureOwedCents(debts, userId), 30);
    assert.equal(netBalanceCents(debts, userId), -20);
  });

  it("expense is pending when linked unsettled debt exists", () => {
    const debts = [
      debt({ expense_id: "e1", debtor_id: bob, creditor_id: userId, amount_cents: 10 }),
    ];
    assert.equal(expenseSettlementStatus("e1", debts), "pending");
    assert.equal(
      expenseSettlementStatus("e1", [
        { ...debts[0], settled_at: "2025-01-01T00:00:00Z" },
      ]),
      "settled",
    );
  });

  it("filters expenses by status", () => {
    const expenses = [{ id: "e1" }, { id: "e2" }];
    const debts = [
      debt({ expense_id: "e1", debtor_id: bob, creditor_id: userId, amount_cents: 10 }),
    ];
    assert.deepEqual(
      filterExpensesByStatus(expenses, debts, "pending").map((e) => e.id),
      ["e1"],
    );
    assert.deepEqual(
      filterExpensesByStatus(expenses, debts, "settled").map((e) => e.id),
      ["e2"],
    );
  });

  it("nets bilateral balance per member", () => {
    const debts = [
      debt({ debtor_id: userId, creditor_id: bob, amount_cents: 60 }),
      debt({ debtor_id: bob, creditor_id: userId, amount_cents: 25 }),
    ];
    const rows = buildDebtRows(debts, userId, [userId, bob]);
    assert.equal(rows.length, 1);
    assert.equal(rows[0].otherUserId, bob);
    assert.equal(rows[0].amountCents, 35);
    assert.equal(rows[0].direction, "you_owe");
  });

  it("filterUnsettled excludes settled", () => {
    const debts = [
      debt({ debtor_id: userId, creditor_id: bob, amount_cents: 10 }),
      debt({
        debtor_id: userId,
        creditor_id: bob,
        amount_cents: 5,
        settled_at: "2025-01-01",
      }),
    ];
    assert.equal(filterUnsettled(debts).length, 1);
  });

  it("dashboard finance contract: net equals owed minus owe", () => {
    const debts = [
      debt({ debtor_id: userId, creditor_id: bob, amount_cents: 60 }),
      debt({ debtor_id: bob, creditor_id: userId, amount_cents: 25 }),
    ];
    const youOwe = sumYouOweCents(debts, userId);
    const youreOwed = sumYoureOwedCents(debts, userId);
    const net = netBalanceCents(debts, userId);
    assert.equal(youOwe, 60);
    assert.equal(youreOwed, 25);
    assert.equal(net, youreOwed - youOwe);
    assert.equal(filterUnsettled(debts).length, 2);
  });
});
