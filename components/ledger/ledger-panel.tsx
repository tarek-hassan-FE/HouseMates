"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useHouse } from "@/components/providers/house-context";
import { MaterialIcon } from "@/components/design/material-icon";
import { StatusBadge } from "@/components/design/status-badge";
import { FinanceOverview } from "@/components/ledger/finance-overview";
import { DebtMatrix, type DebtRow } from "@/components/ledger/debt-matrix";
import { ExpenseAddModal } from "@/components/ledger/expense-add-modal";
import { centsToDisplay } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { expenseIconName } from "@/lib/expense-icons";
import type { Expense } from "@/lib/database.types";
import {
  createExpenseAction,
  deleteExpenseAction,
} from "@/app/[locale]/(app)/ledger/actions";

type DebtEntry = {
  amount_cents: number;
  debtor_id: string;
  creditor_id: string;
};

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
  payerNames,
  userId,
}: {
  expenses: Expense[];
  debts: DebtEntry[];
  members: Member[];
  payerNames: Record<string, string>;
  userId: string;
}) {
  const locale = useLocale();
  const t = useTranslations("ledger");
  const tc = useTranslations("common");
  const { isAdmin } = useHouse();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");

  const memberById = Object.fromEntries(members.map((m) => [m.id, m]));

  const youOweCents = debts
    .filter((d) => d.debtor_id === userId)
    .reduce((s, d) => s + d.amount_cents, 0);

  const youreOwedCents = debts
    .filter((d) => d.creditor_id === userId)
    .reduce((s, d) => s + d.amount_cents, 0);

  const netCents = youreOwedCents - youOweCents;

  const debtRows: DebtRow[] = useMemo(() => {
    const map = new Map<string, DebtRow>();

    for (const d of debts) {
      if (d.debtor_id === userId) {
        const other = memberById[d.creditor_id];
        if (!other) continue;
        const key = other.id;
        const existing = map.get(key);
        if (existing) {
          existing.amountCents += d.amount_cents;
        } else {
          map.set(key, {
            otherUserId: other.id,
            otherUsername: other.username,
            avatar_url: other.avatar_url,
            amountCents: d.amount_cents,
            direction: "you_owe",
          });
        }
      } else if (d.creditor_id === userId) {
        const other = memberById[d.debtor_id];
        if (!other) continue;
        const key = other.id;
        const existing = map.get(key);
        if (existing && existing.direction === "owes_you") {
          existing.amountCents += d.amount_cents;
        } else {
          map.set(key, {
            otherUserId: other.id,
            otherUsername: other.username,
            avatar_url: other.avatar_url,
            amountCents: d.amount_cents,
            direction: "owes_you",
          });
        }
      }
    }

    return Array.from(map.values());
  }, [debts, memberById, userId]);

  const filteredExpenses = useMemo(() => {
    if (filter === "pending") return [];
    return expenses;
  }, [expenses, filter]);

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
    if (!confirm(t("deleteExpenseConfirm"))) return;
    setLoading(true);
    const result = await deleteExpenseAction(id);
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
        />
        <DebtMatrix rows={debtRows} />
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
                <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:min-w-[100px] sm:justify-end">
                  <StatusBadge
                    label={
                      filter === "settled" || filter === "all"
                        ? t("settled")
                        : t("pending")
                    }
                    variant={
                      filter === "settled" || filter === "all"
                        ? "settled"
                        : "pending"
                    }
                  />
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
      />
    </div>
  );
}
