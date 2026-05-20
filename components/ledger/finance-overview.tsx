"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { centsToDisplay } from "@/lib/money";

export function FinanceOverview({
  netCents,
  youOweCents,
  youreOwedCents,
}: {
  netCents: number;
  youOweCents: number;
  youreOwedCents: number;
}) {
  const locale = useLocale();
  const t = useTranslations("ledger");
  const netPositive = netCents >= 0;

  return (
    <div className="glass-panel group relative flex min-h-[220px] flex-col justify-between overflow-hidden rounded-3xl p-8 shadow-sm md:col-span-2">
      <div className="bg-primary/10 absolute -top-8 -end-8 size-48 rounded-full blur-3xl transition-all group-hover:scale-125" />
      <div className="relative z-10">
        <span className="text-label-md text-on-surface-variant tracking-wider uppercase">
          {t("netBalance")}
        </span>
        <h2
          className={`text-display-lg mt-1 font-bold ${netPositive ? "text-tertiary-container" : "text-error"}`}
        >
          {netPositive ? "+" : ""}
          {centsToDisplay(Math.abs(netCents), { locale })}
        </h2>
        <p className="text-body-md text-tertiary mt-1 flex items-center gap-1 font-medium">
          <MaterialIcon name="trending_up" size={18} />
          {netPositive ? t("netPositive") : t("netNegative")}
        </p>
      </div>
      <div className="relative z-10 mt-6 flex gap-4">
        <div className="border-outline-variant/40 flex-1 rounded-2xl border bg-surface-container-lowest/80 p-4">
          <p className="text-label-sm text-outline">{t("youOwe")}</p>
          <p className="text-headline-md text-error font-bold">
            {centsToDisplay(youOweCents, { locale })}
          </p>
        </div>
        <div className="border-outline-variant/40 flex-1 rounded-2xl border bg-surface-container-lowest/80 p-4">
          <p className="text-label-sm text-outline">{t("youreOwed")}</p>
          <p className="text-headline-md text-tertiary-container font-bold">
            {centsToDisplay(youreOwedCents, { locale })}
          </p>
        </div>
      </div>
    </div>
  );
}
