"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { RewardsHero } from "@/components/rewards/rewards-hero";
import { RewardsShop } from "@/components/rewards/rewards-shop";
import { RewardsAdmin } from "@/components/rewards/rewards-admin";
import { RedemptionHistory } from "@/components/rewards/redemption-history";
import type { HouseReward, RewardRedemption } from "@/lib/database.types";

type RewardsPanelProps = {
  totalXp: number;
  rewards: HouseReward[];
  redemptions: RewardRedemption[];
  isAdmin: boolean;
};

export function RewardsPanel({
  totalXp,
  rewards,
  redemptions,
  isAdmin,
}: RewardsPanelProps) {
  const t = useTranslations("rewards");

  const enabledRewards = rewards.filter((r) => r.is_enabled);

  return (
    <>
      <RewardsHero totalXp={totalXp} />

      {isAdmin && <RewardsAdmin rewards={rewards} />}

      <div className="mb-10">
        <h3 className="text-headline-md text-on-surface mb-4 flex items-center gap-2 px-2">
          <MaterialIcon name="storefront" className="text-secondary" />
          {t("catalogTitle")}
        </h3>
        <RewardsShop rewards={enabledRewards} totalXp={totalXp} />
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
