"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { formatNumber } from "@/lib/format";

export function RewardsShopCta({ totalXp }: { totalXp: number }) {
  const locale = useLocale();
  const t = useTranslations("chores");

  return (
    <Link
      href="/rewards"
      className="border-outline-variant/10 bg-surface-container-lowest btn-press flex flex-col gap-4 rounded-[1.5rem] border p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex items-center gap-3">
        <div className="bg-secondary-container/30 text-secondary flex size-12 items-center justify-center rounded-2xl">
          <MaterialIcon name="redeem" size={28} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-headline-md text-on-surface">{t("rewardsShop")}</h3>
          <p className="text-label-md text-on-surface-variant">{t("rewardsCta")}</p>
        </div>
        <MaterialIcon
          name="chevron_right"
          className="text-on-surface-variant shrink-0 rtl:rotate-180"
        />
      </div>
      <div className="bg-primary-container/20 text-primary flex items-center justify-between rounded-xl px-4 py-3">
        <span className="text-label-md font-bold">{t("browseRewards")}</span>
        <span className="text-body-lg font-bold">
          {formatNumber(totalXp, locale)} XP
        </span>
      </div>
    </Link>
  );
}
