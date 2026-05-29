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
  allDebtorsOnCooldown,
  eligibleDebtorIds,
  type ReminderCooldownEntry,
} from "@/lib/payment-reminder-cooldown";
import {
  buildDebtRows,
  debtorsWhoOweYou,
  expenseSettlementStatus,
  filterExpensesByStatus,
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
  type DebtForBalance,
} from "@/lib/ledger-balances";
import { splitEqualAmongMembers } from "@/lib/split-equal";
import { formatExactSplitBreakdown } from "@/lib/split-exact";
import type { Expense } from "@/lib/database.types";
import { sendPaymentRemindersAction } from "@/app/[locale]/(app)/notifications/actions";
import { ImageViewerDialog } from "@/components/shared/image-viewer-dialog";
import { attachExpenseReceiptFromFile } from "@/lib/attach-expense-receipt";
import {
  createExpenseAction,
  deleteExpenseAction,
  settleAllDebtsAction,
  settleBilateralDebtsAction,
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
  reminderCooldowns: initialCooldowns,
}: {
  expenses: Expense[];
  debts: DebtForBalance[];
  members: Member[];
  memberCount: number;
  payerNames: Record<string, string>;
  userId: string;
  reminderCooldowns: ReminderCooldownEntry[];
}) {
  const locale = useLocale();
  const t = useTranslations("ledger");
  const tc = useTranslations("common");
  const confirm = useConfirm();
  const { isAdmin, house } = useHouse();
  const router = useRouter();
  const ta = useTranslations("attachments");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [settlingMemberId, setSettlingMemberId] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [viewerImage, setViewerImage] = useState<{
    url: string;
    title: string;
  } | null>(null);

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

  const canSettleAll = youreOwedCents > 0;

  const debtorsOwed = useMemo(
    () => debtorsWhoOweYou(debts, userId),
    [debts, userId],
  );
  const debtorIds = useMemo(
    () => debtorsOwed.map((d) => d.debtorId),
    [debtorsOwed],
  );
  const eligibleIds = useMemo(
    () => eligibleDebtorIds(debtorIds, initialCooldowns),
    [debtorIds, initialCooldowns],
  );
  const canRemindMembers = !isSoloHouse && youreOwedCents > 0 && debtorIds.length > 0;
  const remindDisabled = allDebtorsOnCooldown(debtorIds, initialCooldowns);
  const remindCooldownHint = remindDisabled ? t("remindAllOnCooldown") : null;

  async function handleCreate(
    e: React.FormEvent<HTMLFormElement>,
    imageFile: File | null,
  ) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createExpenseAction(new FormData(e.currentTarget));
    if (!result.success) {
      setLoading(false);
      setError(result.error);
      return;
    }
    if (imageFile && result.expenseId) {
      const attach = await attachExpenseReceiptFromFile(
        house.id,
        result.expenseId,
        imageFile,
      );
      if (!attach.ok) {
        setError(attach.error);
      }
    }
    setLoading(false);
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

  async function handleRemindMembers() {
    const count = eligibleIds.length;
    if (count === 0) return;
    if (
      !(await confirm({
        message: t("remindMembersConfirm", { count }),
        confirmLabel: t("remindMembers"),
      }))
    )
      return;

    setReminding(true);
    setError(null);
    setSuccess(null);
    const result = await sendPaymentRemindersAction();
    setReminding(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    if (result.skippedCount > 0) {
      setSuccess(
        t("remindPartial", {
          sent: result.notifiedCount,
          skipped: result.skippedCount,
        }),
      );
    } else {
      setSuccess(t("remindSuccess", { count: result.notifiedCount }));
    }
    router.refresh();
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

  async function handleSettleMember(otherUserId: string) {
    const row = debtRows.find((r) => r.otherUserId === otherUserId);
    if (!row) return;

    const name = row.otherUsername;
    const amount = centsToDisplay(row.amountCents, { locale });
    const balance =
      row.direction === "you_owe"
        ? t("youOweAmount", { amount })
        : t("owesYouAmount", { amount });

    if (
      !(await confirm({
        message: t("settleMemberConfirm", { name, balance }),
        confirmLabel: t("settleMember"),
      }))
    )
      return;

    setSettlingMemberId(otherUserId);
    setError(null);
    const result = await settleBilateralDebtsAction(otherUserId);
    setSettlingMemberId(null);
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
          canSettleAll={canSettleAll}
          onSettleAll={handleSettleAll}
          onSettleMember={handleSettleMember}
          settling={loading}
          settlingMemberId={settlingMemberId}
          canRemindMembers={canRemindMembers}
          remindDisabled={remindDisabled}
          remindCooldownHint={remindCooldownHint}
          onRemindMembers={handleRemindMembers}
          reminding={reminding}
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
        {success && (
          <p className="text-tertiary-container text-sm" role="status">
            {success}
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
            const expenseDebts = debts
              .filter((d) => d.expense_id === expense.id)
              .map((d) => ({
                debtorId: d.debtor_id,
                amountCents: d.amount_cents,
              }));
            const exactBreakdown =
              expense.strategy === "exact" && expenseDebts.length > 0
                ? formatExactSplitBreakdown(
                    expenseDebts,
                    payerNames,
                    locale,
                    (cents, loc) => centsToDisplay(cents, { locale: loc }),
                  )
                : null;
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
                      {exactBreakdown ? (
                        <> · {exactBreakdown}</>
                      ) : (
                        shareCents != null &&
                        memberCount > 1 && (
                          <>
                            {" "}
                            ·{" "}
                            {t("shareEach", {
                              amount: centsToDisplay(shareCents, { locale }),
                            })}
                          </>
                        )
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
                  {status === "pending" &&
                    !isSoloHouse &&
                    expense.payer_id === userId && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleSettleExpense(expense.id)}
                        className="text-label-sm text-primary font-bold hover:underline"
                      >
                        {t("markSettled")}
                      </button>
                    )}
                  {expense.receipt_url && (
                    <button
                      type="button"
                      onClick={() =>
                        setViewerImage({
                          url: expense.receipt_url!,
                          title: expense.title,
                        })
                      }
                      className="btn-press text-primary flex size-10 items-center justify-center rounded-full bg-surface-container-high"
                      aria-label={ta("viewPhoto")}
                    >
                      <MaterialIcon name="photo" size={20} />
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
        className="btn-press bg-primary text-primary-foreground fixed end-6 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-40 hidden size-16 items-center justify-center rounded-full shadow-2xl transition-transform hover:scale-110 md:flex md:bottom-10"
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
        members={members}
        payerId={userId}
      />

      <ImageViewerDialog
        open={viewerImage !== null}
        imageUrl={viewerImage?.url ?? null}
        title={viewerImage?.title}
        onClose={() => setViewerImage(null)}
      />
    </div>
  );
}
