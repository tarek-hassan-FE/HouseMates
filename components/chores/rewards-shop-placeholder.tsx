"use client";

import Image from "next/image";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";

const REWARDS = [
  {
    key: "rewardPickMovie" as const,
    descKey: "rewardPickMovieDesc" as const,
    xp: 100,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAqaB-YUpRarDIxzDAsc4DqFCQjU7oejZmddlmFbwVIPlg-JbbYYlvI72kqlAFMfcMb_c6U3wBph0kxbIfCGH75P5jQcKNu-_ThO_4NYXpps7guC4ZecrBCDSri_z1deEqFaBI5d9D4qg2w1YpwjQW8pZVkKIn_VzlaP5WTBufZ5Wd64J3ZuKc1qrJnkGaDVz5wGRSYB3nudZPPbxixGJP-y4QbHoWMsMHqxal1u-BpLPMwjhu-n7qTkVdmR9q8Kzzb5_Y4VG-2wkLU",
    gradient: "from-primary-container to-primary",
  },
  {
    key: "rewardSkipChore" as const,
    descKey: "rewardSkipChoreDesc" as const,
    xp: 250,
    image:
      "https://lh3.googleusercontent.com/aida-public/AB6AXuAEv9Wj41GprcqQkoOifdFkuXVahT5O-c87lL7NZ-3ANmtDv3mqmK8_i66SvMGC7AOKkkksogghgQqBLpraAuxq1bjJYMb1TGyz-rfVoN6Nzuo273oGfCOCTrZ5gQv9WyEi7n3OGR-4iAHQ-qPD1WAjExCCY8kVZFXzqY10zZyAul-sw7hc5b-I48X8DVzVOXWtCzss_cIGr1pvwhXyJ7jdm16oeCfqtpSbnktEmkT2EBNilHdm2WBzCIiPoB3ZxWGP1AqKBGn-Thhn",
    gradient: "from-tertiary-container to-tertiary",
  },
] as const;

export function RewardsShopPlaceholder() {
  const t = useTranslations("chores");
  const tc = useTranslations("common");

  return (
    <div className="space-y-4">
      <h3 className="text-headline-md text-on-surface flex items-center gap-2 px-2">
        <MaterialIcon name="shopping_bag" className="text-secondary" />
        {t("rewardsShop")}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
        {REWARDS.map((reward) => (
          <div
            key={reward.key}
            className="border-outline-variant/10 bg-surface-container-lowest flex flex-col gap-4 rounded-[1.5rem] border p-4 shadow-sm"
          >
            <div
              className={`relative h-32 overflow-hidden rounded-xl bg-gradient-to-br ${reward.gradient}`}
            >
              <Image
                src={reward.image}
                alt={t(reward.key)}
                fill
                className="object-cover opacity-80 transition-transform duration-700 group-hover:scale-110"
              />
              <div className="bg-secondary-container text-on-secondary-container absolute top-2 end-2 rounded-full px-3 py-1 text-label-md font-bold shadow-sm">
                {t("costXp", { cost: reward.xp })}
              </div>
            </div>
            <div>
              <h5 className="text-body-lg font-bold">{t(reward.key)}</h5>
              <p className="text-label-md text-on-surface-variant">
                {t(reward.descKey)}
              </p>
            </div>
            <button
              type="button"
              disabled
              title={tc("comingSoon")}
              className="bg-surface-container-highest text-primary w-full cursor-not-allowed rounded-xl py-3 font-bold opacity-70"
            >
              {t("redeem")}
            </button>
          </div>
        ))}
      </div>
      <p className="text-label-sm text-on-surface-variant px-2">
        {t("rewardsComingSoon")}
      </p>
    </div>
  );
}
