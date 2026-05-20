/**
 * Reward catalog — XP costs are duplicated in
 * supabase/migrations/20250524100000_rewards_shop.sql (redeem_reward RPC).
 * Update both when changing prices or adding rewards.
 */

export const REWARD_KEYS = [
  "pick_friday_movie",
  "skip_dish_duty",
  "dj_cleanup",
  "comfy_couch_weekend",
  "veto_chore_assignment",
  "delivery_pick",
  "trash_immunity_week",
] as const;

export type RewardKey = (typeof REWARD_KEYS)[number];

export type RewardCatalogEntry = {
  key: RewardKey;
  titleKey: string;
  descKey: string;
  xp: number;
  gradient: string;
  image?: string;
  icon: string;
};

export const REWARDS_CATALOG: RewardCatalogEntry[] = [
  {
    key: "dj_cleanup",
    titleKey: "djCleanup",
    descKey: "djCleanupDesc",
    xp: 75,
    gradient: "from-primary-fixed-dim to-primary",
    icon: "queue_music",
  },
  {
    key: "pick_friday_movie",
    titleKey: "pickFridayMovie",
    descKey: "pickFridayMovieDesc",
    xp: 100,
    gradient: "from-primary-container to-primary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqaB-YUpRarDIxzDAsc4DqFCQjU7oejZmddlmFbwVIPlg-JbbYYlvI72kqlAFMfcMb_c6U3wBph0kxbIfCGH75P5jQcKNu-_ThO_4NYXpps7guC4ZecrBCDSri_z1deEqFaBI5d9D4qg2w1YpwjQW8pZVkKIn_VzlaP5WTBufZ5Wd64J3ZuKc1qrJnkGaDVz5wGRSYB3nudZPPbxixGJP-y4QbHoWMsMHqxal1u-BpLPMwjhu-n7qTkVdmR9q8Kzzb5_Y4VG-2wkLU",
    icon: "movie",
  },
  {
    key: "comfy_couch_weekend",
    titleKey: "comfyCouchWeekend",
    descKey: "comfyCouchWeekendDesc",
    xp: 150,
    gradient: "from-secondary-fixed-dim to-secondary",
    icon: "weekend",
  },
  {
    key: "delivery_pick",
    titleKey: "deliveryPick",
    descKey: "deliveryPickDesc",
    xp: 180,
    gradient: "from-tertiary-fixed-dim to-tertiary",
    icon: "delivery_dining",
  },
  {
    key: "veto_chore_assignment",
    titleKey: "vetoChoreAssignment",
    descKey: "vetoChoreAssignmentDesc",
    xp: 200,
    gradient: "from-primary-fixed to-primary-container",
    icon: "block",
  },
  {
    key: "skip_dish_duty",
    titleKey: "skipDishDuty",
    descKey: "skipDishDutyDesc",
    xp: 250,
    gradient: "from-tertiary-container to-tertiary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEv9Wj41GprcqQkoOifdFkuXVahT5O-c87lL7NZ-3ANmtDv3mqmK8_i66SvMGC7AOKkkksogghgQqBLpraAuxq1bjJYMb1TGyz-rfVoN6Nzuo273oGfCOCTrZ5gQv9WyEi7n3OGR-4iAHQ-qPD1WAjExCCY8kVZFXzqY10zZyAul-sw7hc5b-I48X8DVzVOXWtCzss_cIGr1pvwhXyJ7jdm16oeCfqtpSbnktEmkT2EBNilHdm2WBzCIiPoB3ZxWGP1AqKBGn-Thhn",
    icon: "countertops",
  },
  {
    key: "trash_immunity_week",
    titleKey: "trashImmunityWeek",
    descKey: "trashImmunityWeekDesc",
    xp: 400,
    gradient: "from-error-container to-error",
    icon: "delete",
  },
];

const REWARD_COSTS: Record<RewardKey, number> = Object.fromEntries(
  REWARDS_CATALOG.map((r) => [r.key, r.xp]),
) as Record<RewardKey, number>;

export function isValidRewardKey(key: string): key is RewardKey {
  return REWARD_KEYS.includes(key as RewardKey);
}

export function getRewardCost(key: RewardKey): number {
  return REWARD_COSTS[key];
}

export function getRewardEntry(key: RewardKey): RewardCatalogEntry | undefined {
  return REWARDS_CATALOG.find((r) => r.key === key);
}
