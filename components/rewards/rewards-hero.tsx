"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";
import { MaterialIcon } from "@/components/design/material-icon";

export function RewardsHero({ totalXp }: { totalXp: number }) {
  const locale = useLocale();
  const t = useTranslations("rewards");

  return (
    <section className="glass-card shadow-card mb-10 flex flex-col items-center justify-between gap-6 rounded-[2rem] p-6 md:flex-row md:p-8">
      <div className="space-y-2 text-center md:text-start">
        <h2 className="text-headline-lg text-primary flex items-center justify-center gap-2 md:justify-start">
          <MaterialIcon name="redeem" className="text-secondary" />
          {t("title")}
        </h2>
        <p className="text-body-md text-on-surface-variant">{t("subtitle")}</p>
      </div>
      <div className="border-outline-variant/30 flex items-center gap-4 rounded-2xl border bg-white/40 px-8 py-6">
        <div className="flex flex-col items-center">
          <span className="text-headline-md text-secondary font-bold">
            {formatNumber(totalXp, locale)}
          </span>
          <span className="text-label-sm text-on-surface-variant uppercase tracking-tighter">
            {t("yourBalance")}
          </span>
        </div>
      </div>
    </section>
  );
}
