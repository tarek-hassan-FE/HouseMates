"use client";

import { useLocale, useTranslations } from "next-intl";
import { EditableAvatar } from "@/components/profile/editable-avatar";
import { MaterialIcon } from "@/components/design/material-icon";
import { computeXpProgress } from "@/lib/profile/xp-progress";
import type { XpTier } from "@/lib/profile/stats";
import { formatDate, formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProfileIdentityHeaderProps = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalXp: number;
  currentLevel: number;
  houseRole: "admin" | "member";
  createdAt: string;
  xpTier: XpTier;
};

export function ProfileIdentityHeader({
  userId,
  username,
  avatarUrl,
  totalXp,
  currentLevel,
  houseRole,
  createdAt,
  xpTier,
}: ProfileIdentityHeaderProps) {
  const locale = useLocale();
  const t = useTranslations("profile");
  const tc = useTranslations("common");
  const { xpInLevel, progressPercent, xpToNextLevel } = computeXpProgress(
    totalXp,
    currentLevel,
  );

  return (
    <section className="shadow-card mb-6 overflow-hidden rounded-xl bg-white">
      <div className="from-primary to-primary-container h-28 bg-gradient-to-r md:h-32" />
      <div className="px-stitch-md pb-stitch-md -mt-12 flex flex-col gap-4 sm:px-6 sm:pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <div className="relative shrink-0">
              <EditableAvatar
                userId={userId}
                src={avatarUrl}
                name={username}
                className="!items-start"
                avatarClassName="!size-24 border-4 border-white shadow-lg sm:!size-32"
                hideCameraBadge
              />
              {houseRole === "admin" && (
                <span className="bg-secondary-container text-on-secondary-container absolute end-1 bottom-1 flex size-7 items-center justify-center rounded-full shadow-md">
                  <MaterialIcon name="verified" size={18} filled />
                </span>
              )}
            </div>
            <div className="mb-1 min-w-0">
              <h2 className="text-headline-lg text-on-surface truncate">
                {username}
              </h2>
              <div className="text-body-md text-on-surface-variant mt-1 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "font-bold",
                    xpTier === "elite" ? "text-primary" : "text-on-surface-variant",
                  )}
                >
                  {xpTier === "elite" ? t("eliteRoommate") : t("roommateTier")}
                </span>
                <span aria-hidden>•</span>
                <span>
                  {t("memberSince", {
                    date: formatDate(createdAt, locale, {
                      month: "short",
                      year: "numeric",
                    }),
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="border-outline-variant/30 bg-surface-container-low w-full min-w-0 rounded-xl border p-4 sm:max-w-xs">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-label-md text-primary font-semibold">
                {tc("levelShort", { level: currentLevel })}
              </span>
              <span className="text-label-sm text-on-surface-variant">
                {t("xpInLevel", {
                  current: formatNumber(xpInLevel, locale),
                  max: formatNumber(100, locale),
                })}
              </span>
            </div>
            <div
              className="bg-outline-variant/30 h-3 w-full overflow-hidden rounded-full"
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
            <p className="text-label-sm text-on-surface-variant mt-2 text-end">
              {t("xpToNext", { xp: formatNumber(xpToNextLevel, locale) })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
