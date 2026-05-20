"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatNumber } from "@/lib/format";

export function ChoreHubHero({
  totalXp,
  rank,
}: {
  totalXp: number;
  rank: number;
}) {
  const locale = useLocale();
  const t = useTranslations("chores");

  return (
    <section className="glass-card shadow-card mb-10 flex flex-col items-center justify-between gap-6 rounded-[2rem] p-6 md:flex-row md:p-8">
      <div className="space-y-2 text-center md:text-start">
        <h2 className="text-headline-lg text-primary">{t("hubTitle")}</h2>
        <p className="text-body-md text-on-surface-variant">{t("hubSubtitle")}</p>
      </div>
      <div className="border-outline-variant/30 flex items-center gap-8 rounded-2xl border bg-white/40 p-6">
        <div className="flex flex-col items-center">
          <span className="text-headline-md text-secondary font-bold">
            {formatNumber(totalXp, locale)}
          </span>
          <span className="text-label-sm text-on-surface-variant uppercase tracking-tighter">
            {t("yourTotalXp")}
          </span>
        </div>
        <div className="bg-outline-variant/30 h-12 w-px" />
        <div className="flex flex-col items-center">
          <span className="text-headline-md text-tertiary font-bold">#{rank}</span>
          <span className="text-label-sm text-on-surface-variant uppercase tracking-tighter">
            {t("rank")}
          </span>
        </div>
      </div>
    </section>
  );
}
