"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { centsToDisplay } from "@/lib/money";
import { settleAllDebtsAction } from "@/app/[locale]/(app)/ledger/actions";

export function FinanceStatusCard({
  youOweCents,
  memberCount,
  hasUnsettledDebts,
}: {
  youOweCents: number;
  memberCount: number;
  hasUnsettledDebts: boolean;
}) {
  const locale = useLocale();
  const t = useTranslations("dashboard");
  const tl = useTranslations("ledger");
  const router = useRouter();
  const [settling, setSettling] = useState(false);
  const isSoloHouse = memberCount <= 1;

  async function handleSettleAll() {
    if (!confirm(tl("settleAllConfirm"))) return;
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
      <div className="relative z-10 mb-6">
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
            <p className="text-body-md text-on-surface-variant">{t("youOwe")}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-display-lg text-error font-bold">
                {centsToDisplay(youOweCents, { locale })}
              </span>
              <span className="text-body-md text-on-surface-variant">
                {t("unsettled")}
              </span>
            </div>
          </>
        )}
        <div className="border-error/10 bg-error/5 mt-6 flex items-center gap-4 rounded-2xl border p-3">
          <div className="bg-error/20 text-error flex size-10 items-center justify-center rounded-full">
            <MaterialIcon name="event_repeat" size={20} />
          </div>
          <div>
            <p className="text-label-sm text-error font-medium uppercase">
              {t("nextSharedBill")}
            </p>
            <p className="text-body-md text-on-surface font-bold">
              {t("electricityDue")}
            </p>
            <p className="text-label-sm text-on-surface-variant mt-0.5">
              {t("placeholderSoon")}
            </p>
          </div>
        </div>
      </div>
      <div className="relative z-10 mt-8 flex flex-col gap-2">
        {!isSoloHouse && hasUnsettledDebts && (
          <button
            type="button"
            disabled={settling}
            onClick={handleSettleAll}
            className="btn-press bg-tertiary text-on-tertiary flex w-full items-center justify-center gap-2 rounded-2xl py-4 font-bold shadow-md transition-colors disabled:opacity-50"
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
