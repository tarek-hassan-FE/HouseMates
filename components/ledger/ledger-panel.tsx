"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useConfirm } from "@/components/providers/confirm-provider";
import { useHouse } from "@/components/providers/house-context";
import { MaterialIcon } from "@/components/design/material-icon";
import { StatusBadge } from "@/components/design/status-badge";
import { FinanceOverview } from "@/components/ledger/finance-overview";
import { DebtMatrix, type DebtRow } from "@/components/ledger/debt-matrix";
import { ExpenseAddModal } from "@/components/ledger/expense-add-modal";
import { centsToDisplay } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { expenseIconName } from "@/lib/expense-icons";
import {
  buildDebtRows,
  expenseSettlementStatus,
  filterExpensesByStatus,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
  type DebtForBalance,
} from "@/lib/ledger-balances";
import { splitEqualAmongMembers } from "@/lib/split-equal";
import type { Expense } from "@/lib/database.types";
import {
  createExpenseAction,
  deleteExpenseAction,
  settleAllDebtsAction,
  settleExpenseAction,
} from "@/app/[locale]/(app)/ledger/actions";

type Member = {
  id: string;
  username: string;
  avatar_url?: string | null;
};

type Filter = "all" | "pending" | "settled";

export function LedgerPanel({
  expenses,
  debts,
  members,
  memberCount,
  payerNames,
  userId,
}: {
  expenses: Expense[];
  debts: DebtForBalance[];
  members: Member[];
  memberCount: number;
  payerNames: Record<string, string>;
  userId: string;
}) {
  const locale = useLocale();
  const t = useTranslations("ledger");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const { isAdmin } = useHouse();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const isSoloHouse = memberCount <= 1;
  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));
  const memberIds = members.map((m) => m.id);

  const youOweCents = sumYouOweCents(debts, userId);
  const youreOwedCents = sumYoureOwedCents(debts, userId);
  const netCents = netBalanceCents(debts, userId);

  const debtRows: DebtRow[] = useMemo(() => {
    const rows = buildDebtRows(debts, userId, memberIds);
    return rows.map((row) => {
      const other = memberById[row.otherUserId];
      return {
        ...row,
        otherUsername: other?.username ?? tc("unknown"),
        avatar_url: other?.avatar_url,
      };
    });
  }, [debts, userId, memberIds, memberById, tc]);

  const filteredExpenses = useMemo(
    () => filterExpensesByStatus(expenses, debts, filter),
    [expenses, debts, filter],
  );

  const hasUnsettledDebts = debts.some((d) => d.settled_at == null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createExpenseAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    (e.target as HTMLFormElement).reset();
    setModalOpen(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (
      !(await confirm({
        message: t("deleteExpenseConfirm"),
        confirmLabel: tc("delete"),
        destructive: true,
      }))
    )
      return;
    setLoading(true);
    const result = await deleteExpenseAction(id);
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleSettleExpense(expenseId: string) {
    setLoading(true);
    setError(null);
    const result = await settleExpenseAction(expenseId);
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  async function handleSettleAll() {
    if (
      !(await confirm({
        message: t("settleAllConfirm"),
        confirmLabel: t("settleAll"),
      }))
    )
      return;
    setLoading(true);
    setError(null);
    const result = await settleAllDebtsAction();
    setLoading(false);
    if (!result.success) setError(result.error);
    else router.refresh();
  }

  const filters: { key: Filter; labelKey: "filterAll" | "filterPending" | "filterSettled" }[] = [
    { key: "all", labelKey: "filterAll" },
    { key: "pending", labelKey: "filterPending" },
    { key: "settled", labelKey: "filterSettled" },
  ];

  return (
    <div className="space-y-10">
      <section className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <FinanceOverview
          netCents={netCents}
          youOweCents={youOweCents}
          youreOwedCents={youreOwedCents}
          isSoloHouse={isSoloHouse}
        />
        <DebtMatrix
          rows={debtRows}
          isSoloHouse={isSoloHouse}
          hasUnsettledDebts={hasUnsettledDebts}
          onSettleAll={handleSettleAll}
          settling={loading}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-headline-lg text-on-surface">
            {t("recentTransactions")}
          </h2>
          <div className="flex gap-2">
            {filters.map(({ key, labelKey }) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`text-label-md rounded-full px-4 py-2 transition-all ${
                  filter === key
                    ? "bg-primary-container text-on-primary-container font-bold"
                    : "bg-surface-container-highest text-on-surface-variant hover:bg-primary-container hover:text-on-primary-container"
                }`}
              >
                {t(labelKey)}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        )}

        <ul className="space-y-2">
          {filteredExpenses.length === 0 && (
            <li className="text-on-surface-variant border-outline-variant rounded-2xl border border-dashed p-10 text-center">
              {filter === "pending" ? t("noPending") : t("noExpenses")}
            </li>
          )}
          {filteredExpenses.map((expense) => {
            const icon = expenseIconName(expense.title);
            const strategyLabel =
              expense.strategy === "equal"
                ? t("equalSplit")
                : t("customSplit");
            const status = expenseSettlementStatus(expense.id, debts);
            const splitDebts =
              expense.strategy === "equal" && memberCount > 1
                ? splitEqualAmongMembers(
                    expense.amount_cents,
                    memberIds,
                    expense.payer_id,
                  )
                : [];
            const shareCents =
              splitDebts.length > 0 ? splitDebts[0].amountCents : null;

            return (
              <li
                key={expense.id}
                className="group border-outline-variant/10 bg-surface-container-lowest hover:shadow-md flex flex-col gap-3 rounded-2xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 sm:flex-row sm:flex-wrap sm:items-center"
              >
                <div className="flex w-full items-center gap-4 sm:min-w-0 sm:flex-[1_1_12rem]">
                  <div className="bg-surface-container text-primary flex size-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110">
                    <MaterialIcon name={icon} />
                  </div>
                  <div>
                    <h4 className="text-body-lg text-on-surface font-bold">
                      {expense.title}
                    </h4>
                    <p className="text-label-sm text-outline">
                      {t("paidBy", {
                        name: payerNames[expense.payer_id] ?? tc("unknown"),
                      })}{" "}
                      · {strategyLabel}
                      {shareCents != null && memberCount > 1 && (
                        <>
                          {" "}
                          ·{" "}
                          {t("shareEach", {
                            amount: centsToDisplay(shareCents, { locale }),
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex w-full flex-col sm:flex-1 sm:items-center">
                  <p className="text-label-sm text-outline">{t("date")}</p>
                  <p className="text-body-md text-on-surface">
                    {formatDate(expense.created_at, locale)}
                  </p>
                </div>
                <div className="flex w-full flex-col sm:flex-1 sm:items-end">
                  <p className="text-label-sm text-outline sm:text-end">
                    {t("totalAmount")}
                  </p>
                  <p className="text-headline-md text-primary font-bold">
                    {centsToDisplay(expense.amount_cents, { locale })}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center justify-end gap-3 sm:w-auto sm:min-w-[140px]">
                  {isSoloHouse ? (
                    <StatusBadge label={t("logged")} variant="neutral" />
                  ) : (
                    <StatusBadge
                      label={
                        status === "settled" ? t("settled") : t("pending")
                      }
                      variant={status === "settled" ? "settled" : "pending"}
                    />
                  )}
                  {status === "pending" && !isSoloHouse && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleSettleExpense(expense.id)}
                      className="text-label-sm text-primary font-bold hover:underline"
                    >
                      {t("markSettled")}
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => handleDelete(expense.id)}
                      className="text-error text-label-sm hover:underline"
                      aria-label={`${tc("delete")} ${expense.title}`}
                    >
                      {tc("delete")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className="btn-press bg-primary text-primary-foreground fixed end-6 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 flex size-16 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 md:bottom-10"
        aria-label={t("addExpense")}
      >
        <MaterialIcon name="add" size={32} />
      </button>

      <ExpenseAddModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        loading={loading}
        error={error}
        isSoloHouse={isSoloHouse}
      />
    </div>
  );
}
