/**
 * Default reward templates — seeded into house_rewards via seed_house_rewards().
 * Legacy redemptions may still reference preset_key / reward_key for i18n fallback.
 */

export const REWARD_PRESET_KEYS = [
  "dj_cleanup",
  "pick_friday_movie",
  "comfy_couch_weekend",
  "delivery_pick",
  "veto_chore_assignment",
  "skip_dish_duty",
  "trash_immunity_week",
] as const;

export type RewardPresetKey = (typeof REWARD_PRESET_KEYS)[number];

export type RewardTemplate = {
  presetKey: RewardPresetKey;
  titleKey: string;
  descKey: string;
  xp: number;
  gradient: string;
  image?: string;
  icon: string;
};

export const DEFAULT_REWARD_TEMPLATES: RewardTemplate[] = [
  {
    presetKey: "dj_cleanup",
    titleKey: "djCleanup",
    descKey: "djCleanupDesc",
    xp: 75,
    gradient: "from-primary-fixed-dim to-primary",
    icon: "queue_music",
  },
  {
    presetKey: "pick_friday_movie",
    titleKey: "pickFridayMovie",
    descKey: "pickFridayMovieDesc",
    xp: 100,
    gradient: "from-primary-container to-primary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqaB-YUpRarDIxzDAsc4DqFCQjU7oejZmddlmFbwVIPlg-JbbYYlvI72kqlAFMfcMb_c6U3wBph0kxbIfCGH75P5jQcKNu-_ThO_4NYXpps7guC4ZecrBCDSri_z1deEqFaBI5d9D4qg2w1YpwjQW8pZVkKIn_VzlaP5WTBufZ5Wd64J3ZuKc1qrJnkGaDVz5wGRSYB3nudZPPbxixGJP-y4QbHoWMsMHqxal1u-BpLPMwjhu-n7qTkVdmR9q8Kzzb5_Y4VG-2wkLU",
    icon: "movie",
  },
  {
    presetKey: "comfy_couch_weekend",
    titleKey: "comfyCouchWeekend",
    descKey: "comfyCouchWeekendDesc",
    xp: 150,
    gradient: "from-secondary-fixed-dim to-secondary",
    icon: "weekend",
  },
  {
    presetKey: "delivery_pick",
    titleKey: "deliveryPick",
    descKey: "deliveryPickDesc",
    xp: 180,
    gradient: "from-tertiary-fixed-dim to-tertiary",
    icon: "delivery_dining",
  },
  {
    presetKey: "veto_chore_assignment",
    titleKey: "vetoChoreAssignment",
    descKey: "vetoChoreAssignmentDesc",
    xp: 200,
    gradient: "from-primary-fixed to-primary-container",
    icon: "block",
  },
  {
    presetKey: "skip_dish_duty",
    titleKey: "skipDishDuty",
    descKey: "skipDishDutyDesc",
    xp: 250,
    gradient: "from-tertiary-container to-tertiary",
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEv9Wj41GprcqQkoOifdFkuXVahT5O-c87lL7NZ-3ANmtDv3mqmK8_i66SvMGC7AOKkkksogghgQqBLpraAuxq1bjJYMb1TGyz-rfVoN6Nzuo273oGfCOCTrZ5gQv9WyEi7n3OGR-4iAHQ-qPD1WAjExCCY8kVZFXzqY10zZyAul-sw7hc5b-I48X8DVzVOXWtCzss_cIGr1pvwhXyJ7jdm16oeCfqtpSbnktEmkT2EBNilHdm2WBzCIiPoB3ZxWGP1AqKBGn-Thhn",
    icon: "countertops",
  },
  {
    presetKey: "trash_immunity_week",
    titleKey: "trashImmunityWeek",
    descKey: "trashImmunityWeekDesc",
    xp: 400,
    gradient: "from-error-container to-error",
    icon: "delete",
  },
];

export function isRewardPresetKey(key: string): key is RewardPresetKey {
  return REWARD_PRESET_KEYS.includes(key as RewardPresetKey);
}

export function getRewardTemplate(
  key: RewardPresetKey,
): RewardTemplate | undefined {
  return DEFAULT_REWARD_TEMPLATES.find((r) => r.presetKey === key);
}
