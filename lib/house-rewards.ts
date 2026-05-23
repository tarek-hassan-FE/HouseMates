import {
  getRewardTemplate,
  isRewardPresetKey,
  type RewardPresetKey,
} from "@/lib/rewards-catalog";
import type { HouseReward, RewardRedemption } from "@/lib/database.types";

export type ShopReward = {
  id: string;
  title: string;
  description: string | null;
  xpCost: number;
  icon: string;
  gradient: string | null;
  imageUrl: string | null;
  presetKey: string | null;
};

export function toShopReward(row: HouseReward): ShopReward {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    xpCost: row.xp_cost,
    icon: row.icon,
    gradient: row.gradient,
    imageUrl: row.image_url,
    presetKey: row.preset_key,
  };
}

type TranslateFn = (key: string) => string;

export function resolveRedemptionTitle(
  redemption: RewardRedemption,
  t: TranslateFn,
): string {
  if (redemption.house_reward?.title) {
    return redemption.house_reward.title;
  }

  const key = redemption.reward_key;
  if (isRewardPresetKey(key)) {
    const template = getRewardTemplate(key as RewardPresetKey);
    if (template) return t(template.titleKey);
  }

  return key;
}
