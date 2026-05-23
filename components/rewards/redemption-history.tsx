"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { formatDate } from "@/lib/format";
import { resolveRedemptionTitle } from "@/lib/house-rewards";
import type { RewardRedemption } from "@/lib/database.types";

export function RedemptionHistory({
  redemptions,
}: {
  redemptions: RewardRedemption[];
}) {
  const locale = useLocale();
  const t = useTranslations("rewards");

  if (redemptions.length === 0) {
    return (
      <p className="text-label-md text-on-surface-variant border-outline-variant rounded-[1.5rem] border border-dashed p-8 text-center">
        {t("noRedemptions")}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {redemptions.map((r) => {
        const username = r.profile?.username ?? t("unknownUser");
        const rewardTitle = resolveRedemptionTitle(r, t);

        return (
          <li
            key={r.id}
            className="bg-surface-container-lowest border-outline-variant/10 flex items-start gap-3 rounded-2xl border p-4"
          >
            <div className="bg-secondary-container/30 text-secondary flex size-10 shrink-0 items-center justify-center rounded-xl">
              <MaterialIcon name="redeem" size={22} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-body-md text-on-surface">
                {t("redemptionLine", { username, reward: rewardTitle })}
              </p>
              <p className="text-label-sm text-on-surface-variant mt-0.5">
                {t("redemptionMeta", {
                  xp: r.xp_spent,
                  date: formatDate(r.created_at, locale, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
