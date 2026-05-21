"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { centsToDisplay } from "@/lib/money";

type ProfileFinanceSnapshotProps = {
  netCents: number;
  youOweCents: number;
  youreOwedCents: number;
  memberCount: number;
};

export function ProfileFinanceSnapshot({
  netCents,
  youOweCents,
  youreOwedCents,
  memberCount,
}: ProfileFinanceSnapshotProps) {
  const locale = useLocale();
  const t = useTranslations("profile");
  const tl = useTranslations("ledger");
  const isSoloHouse = memberCount <= 1;
  const netPositive = netCents >= 0;

  return (
    <section className="glass-card shadow-card mb-6 rounded-[2rem] p-stitch-md">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <span className="bg-primary/10 text-primary mb-2 inline-block rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
            {t("financialSnapshot")}
          </span>
          <h3 className="text-headline-md text-on-surface">{t("yourStanding")}</h3>
        </div>
        <MaterialIcon
          name="account_balance_wallet"
          className="text-primary/25 shrink-0"
          size={40}
        />
      </div>

      {isSoloHouse ? (
        <p className="text-body-md text-on-surface-variant">{tl("soloHouseHint")}</p>
      ) : (
        <>
          <p
            className={`text-headline-md font-bold ${netPositive ? "text-tertiary-container" : "text-error"}`}
          >
            {netPositive
              ? t("youAreOwed", {
                  amount: centsToDisplay(Math.abs(netCents), { locale }),
                })
              : t("youOweOverall", {
                  amount: centsToDisplay(Math.abs(netCents), { locale }),
                })}
          </p>
          <p className="text-body-md text-on-surface-variant mt-1">
            {netPositive ? tl("netPositive") : tl("netNegative")}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="border-outline-variant/40 rounded-xl border bg-surface-container-lowest/80 p-3">
              <p className="text-label-sm text-outline">{tl("youOwe")}</p>
              <p className="text-headline-md text-error font-bold">
                {centsToDisplay(youOweCents, { locale })}
              </p>
            </div>
            <div className="border-outline-variant/40 rounded-xl border bg-surface-container-lowest/80 p-3">
              <p className="text-label-sm text-outline">{tl("youreOwed")}</p>
              <p className="text-headline-md text-tertiary-container font-bold">
                {centsToDisplay(youreOwedCents, { locale })}
              </p>
            </div>
          </div>
        </>
      )}

      <Link
        href="/ledger"
        className="btn-press text-primary text-label-md mt-5 inline-flex items-center gap-1 font-semibold"
      >
        {t("viewFinances")}
        <MaterialIcon name="arrow_forward" size={18} />
      </Link>
    </section>
  );
}
