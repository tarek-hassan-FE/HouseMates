"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { useConfirm } from "@/components/providers/confirm-provider";
import { centsToDisplay } from "@/lib/money";
import {
  allDebtorsOnCooldown,
  eligibleDebtorIds,
  type ReminderCooldownEntry,
} from "@/lib/payment-reminder-cooldown";
import { sendPaymentRemindersAction } from "@/app/[locale]/(app)/notifications/actions";
import { settleAllDebtsAction } from "@/app/[locale]/(app)/ledger/actions";

export function FinanceStatusCard({
  netCents,
  youOweCents,
  youreOwedCents,
  memberCount,
  hasUnsettledDebts,
  debtorIds,
  reminderCooldowns,
}: {
  netCents: number;
  youOweCents: number;
  youreOwedCents: number;
  memberCount: number;
  hasUnsettledDebts: boolean;
  debtorIds: string[];
  reminderCooldowns: ReminderCooldownEntry[];
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tl = useTranslations("ledger");
  const confirm = useConfirm();
  const router = useRouter();
  const [settling, setSettling] = useState(false);
  const [reminding, setReminding] = useState(false);
  const [remindMessage, setRemindMessage] = useState<string | null>(null);
  const isSoloHouse = memberCount <= 1;
  const netPositive = netCents >= 0;
  const eligibleIds = eligibleDebtorIds(debtorIds, reminderCooldowns);
  const canRemindMembers =
    !isSoloHouse && youreOwedCents > 0 && debtorIds.length > 0;
  const remindDisabled = allDebtorsOnCooldown(debtorIds, reminderCooldowns);

  async function handleRemindMembers() {
    const count = eligibleIds.length;
    if (count === 0) return;
    if (
      !(await confirm({
        message: tl("remindMembersConfirm", { count }),
        confirmLabel: tl("remindMembers"),
      }))
    )
      return;
    setReminding(true);
    setRemindMessage(null);
    const result = await sendPaymentRemindersAction();
    setReminding(false);
    if (!result.success) {
      setRemindMessage(result.error);
      return;
    }
    if (result.skippedCount > 0) {
      setRemindMessage(
        tl("remindPartial", {
          sent: result.notifiedCount,
          skipped: result.skippedCount,
        }),
      );
    } else {
      setRemindMessage(tl("remindSuccess", { count: result.notifiedCount }));
    }
    router.refresh();
  }

  async function handleSettleAll() {
    if (
      !(await confirm({
        message: tl("settleAllConfirm"),
        confirmLabel: tl("settleAll"),
      }))
    )
      return;
    setSettling(true);
    const result = await settleAllDebtsAction();
    setSettling(false);
    if (result.success) router.refresh();
  }

  return (
    <div className="glass-card shadow-card relative flex h-full flex-col overflow-hidden rounded-3xl p-6 md:p-8">
      <MaterialIcon
        name="account_balance_wallet"
        className="text-primary/20 absolute top-4 end-4 rotate-12"
        size={64}
      />
      <div className="relative z-10 mb-4">
        <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
          {t("financeOverview")}
        </span>
        <h3 className="text-headline-md text-on-surface mt-2">{t("yourStatus")}</h3>
      </div>
      <div className="relative z-10 flex flex-grow flex-col justify-center">
        {isSoloHouse ? (
          <p className="text-body-md text-on-surface-variant">{tl("soloHouseHint")}</p>
        ) : (
          <>
            <span className="text-label-md text-on-surface-variant tracking-wider uppercase">
              {tl("netBalance")}
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-display-lg font-bold ${netPositive ? "text-tertiary-container" : "text-error"}`}
              >
                {netPositive ? "+" : ""}
                {centsToDisplay(Math.abs(netCents), { locale })}
              </span>
            </div>
            <p className="text-body-md text-tertiary mt-1 flex items-center gap-1 font-medium">
              <MaterialIcon name="trending_up" size={18} />
              {netPositive ? tl("netPositive") : tl("netNegative")}
            </p>
            <div className="mt-6 flex gap-3">
              <div className="border-outline-variant/40 flex-1 rounded-2xl border bg-surface-container-lowest/80 p-3">
                <p className="text-label-sm text-outline">{tl("youOwe")}</p>
                <p className="text-headline-md text-error font-bold">
                  {centsToDisplay(youOweCents, { locale })}
                </p>
              </div>
              <div className="border-outline-variant/40 flex-1 rounded-2xl border bg-surface-container-lowest/80 p-3">
                <p className="text-label-sm text-outline">{tl("youreOwed")}</p>
                <p className="text-headline-md text-tertiary-container font-bold">
                  {centsToDisplay(youreOwedCents, { locale })}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      <div className="relative z-10 mt-8 flex flex-col gap-2">
        {remindMessage && (
          <p className="text-tertiary-container text-label-sm" role="status">
            {remindMessage}
          </p>
        )}
        {!isSoloHouse && canRemindMembers && (
          <button
            type="button"
            disabled={remindDisabled || reminding || settling}
            onClick={handleRemindMembers}
            className="btn-press border-outline-variant/40 text-secondary flex w-full items-center justify-center gap-2 rounded-2xl border bg-surface-container-lowest/80 py-4 font-bold transition-colors disabled:opacity-50"
          >
            <MaterialIcon name="notifications_active" />
            {tl("remindMembers")}
          </button>
        )}
        {canRemindMembers && remindDisabled && (
          <p className="text-label-sm text-on-surface-variant text-center">
            {tl("remindAllOnCooldown")}
          </p>
        )}
        {!isSoloHouse && hasUnsettledDebts && (
          <button
            type="button"
            disabled={settling}
            onClick={handleSettleAll}
            className="btn-press btn-success flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold shadow-md transition-colors disabled:opacity-50"
          >
            <MaterialIcon name="check_circle" />
            {tl("settleAll")}
          </button>
        )}
        <Link
          href="/ledger"
          className="btn-press bg-primary text-primary-foreground flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold shadow-md transition-colors hover:bg-primary-container"
        >
          <MaterialIcon name="payments" />
          {t("settleUp")}
        </Link>
      </div>
    </div>
  );
}
