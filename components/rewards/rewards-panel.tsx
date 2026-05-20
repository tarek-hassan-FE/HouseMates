"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { RewardsHero } from "@/components/rewards/rewards-hero";
import { RewardsShop } from "@/components/rewards/rewards-shop";
import { RedemptionHistory } from "@/components/rewards/redemption-history";
import type { RewardRedemption } from "@/lib/database.types";

type RewardsPanelProps = {
  totalXp: number;
  redemptions: RewardRedemption[];
};

export function RewardsPanel({
  totalXp,
  redemptions: serverRedemptions,
}: RewardsPanelProps) {
  const t = useTranslations("rewards");
  const [displayXp, setDisplayXp] = useState(totalXp);
  const [redemptions, setRedemptions] = useState(serverRedemptions);

  useEffect(() => {
    setDisplayXp(totalXp);
    setRedemptions(serverRedemptions);
  }, [totalXp, serverRedemptions]);

  return (
    <>
      <RewardsHero totalXp={displayXp} />

      <div className="mb-10">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2 px-2">
          <MaterialIcon name="storefront" className="text-secondary" />
          {t("catalogTitle")}
        </h3>
        <RewardsShop
          totalXp={displayXp}
          onRedeemed={(xpSpent) => {
            setDisplayXp((xp) => Math.max(0, xp - xpSpent));
          }}
        />
      </div>

      <section className="space-y-4">
        <h3 className="text-headline-md text-on-surface flex items-center gap-2 px-2">
          <MaterialIcon name="history" className="text-primary" />
          {t("recentRedemptions")}
        </h3>
        <RedemptionHistory redemptions={redemptions} />
      </section>
    </>
  );
}
