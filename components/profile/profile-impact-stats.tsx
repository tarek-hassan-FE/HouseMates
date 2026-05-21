"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";

type ProfileImpactStatsProps = {
  choresCompleted: number;
  totalXp: number;
  financialReliability: number;
  topPercent: boolean;
};

export function ProfileImpactStats({
  choresCompleted,
  totalXp,
  financialReliability,
  topPercent,
}: ProfileImpactStatsProps) {
  const locale = useLocale();
  const t = useTranslations("profile");

  return (
    <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
      <div className="border-secondary-container group relative overflow-hidden rounded-xl border-b-4 bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.03)]">
        <div className="absolute end-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
          <MaterialIcon name="task_alt" size={64} />
        </div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span className="text-label-md text-on-surface-variant font-semibold tracking-wider uppercase">
            {t("choresCompleted")}
          </span>
          {topPercent && (
            <span className="bg-tertiary/10 text-tertiary text-label-sm rounded-full px-2 py-0.5 font-bold">
              {t("topPercent")}
            </span>
          )}
        </div>
        <p className="text-display-lg text-on-surface font-bold">
          {formatNumber(choresCompleted, locale)}
        </p>
        <p className="text-body-md text-on-surface-variant mt-1">
          {t("consistencyBlurb")}
        </p>
      </div>

      <div className="border-primary group relative overflow-hidden rounded-xl border-b-4 bg-white p-6 shadow-[0_10px_25px_rgba(0,0,0,0.03)]">
        <div className="text-primary absolute end-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
          <MaterialIcon name="military_tech" size={64} />
        </div>
        <span className="text-label-md text-on-surface-variant mb-2 block font-semibold tracking-wider uppercase">
          {t("totalXpEarned")}
        </span>
        <p className="text-display-lg text-on-surface font-bold">
          {formatNumber(totalXp, locale)}
        </p>
        <p className="text-body-md text-on-surface-variant mt-1">
          {t("lifetimeContribution")}
        </p>
      </div>

      <Link
        href="/ledger"
        className="glass-card group relative block overflow-hidden rounded-xl border border-white/50 p-6 shadow-[0_10px_25px_rgba(0,0,0,0.05)] transition-colors hover:bg-white/80"
      >
        <div className="text-primary absolute end-0 top-0 p-4 opacity-10 transition-transform group-hover:scale-110">
          <MaterialIcon name="payments" size={64} />
        </div>
        <span className="text-label-md text-primary mb-2 block font-semibold tracking-wider uppercase">
          {t("financialReliability")}
        </span>
        <p className="text-display-lg text-primary font-bold">
          {financialReliability}%
        </p>
        <p className="text-body-md text-on-surface-variant mt-1">
          {t("onTimePayments")}
        </p>
      </Link>
    </section>
  );
}
