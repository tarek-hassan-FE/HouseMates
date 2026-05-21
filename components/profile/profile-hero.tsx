"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { EditableAvatar } from "@/components/profile/editable-avatar";
import { computeXpProgress } from "@/lib/profile/xp-progress";
import { formatNumber } from "@/lib/format";

type ProfileHeroProps = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalXp: number;
  currentLevel: number;
};

export function ProfileHero({
  userId,
  username,
  avatarUrl,
  totalXp,
  currentLevel,
}: ProfileHeroProps) {
  const locale = useLocale();
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { xpInLevel, progressPercent, xpToNextLevel } = computeXpProgress(
    totalXp,
    currentLevel,
  );

  return (
    <section className="glass-card shadow-card mb-6 flex flex-col items-center gap-6 rounded-[2rem] p-stitch-md sm:p-8">
      <EditableAvatar
        userId={userId}
        src={avatarUrl}
        name={username}
      />
      <div className="text-center">
        <h2 className="text-headline-lg text-on-surface">{username}</h2>
        <p className="text-body-md text-on-surface-variant mt-1">
          {tc("xpShort", {
            level: currentLevel,
            xp: formatNumber(totalXp, locale),
          })}
        </p>
      </div>

      <div className="border-outline-variant/30 w-full max-w-md rounded-2xl border bg-white/50 p-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold tracking-widest uppercase">
            <MaterialIcon name="military_tech" size={14} />
            {tc("levelShort", { level: currentLevel })}
          </span>
          <span className="text-label-sm text-on-surface-variant">
            {t("xpToNext", { xp: formatNumber(xpToNextLevel, locale) })}
          </span>
        </div>
        <div
          className="bg-surface-container-high h-3 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={xpInLevel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t("levelProgress")}
        >
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.round(progressPercent * 100)}%` }}
          />
        </div>
        <p className="text-label-sm text-on-surface-variant mt-2 text-center">
          {t("xpInLevel", {
            current: formatNumber(xpInLevel, locale),
            max: formatNumber(100, locale),
          })}
        </p>
      </div>
    </section>
  );
}
