"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { AvatarRing } from "@/components/design/avatar-ring";

export type LeaderboardEntry = {
  username: string;
  total_xp: number;
  avatar_url?: string | null;
  placeholder?: boolean;
};

function placeholderEntry(t: ReturnType<typeof useTranslations<"common">>): LeaderboardEntry {
  return {
    username: t("open"),
    total_xp: 0,
    placeholder: true,
  };
}

function buildPodium(
  entries: LeaderboardEntry[],
  t: ReturnType<typeof useTranslations<"common">>,
) {
  return {
    first: entries[0] ?? {
      username: t("dash"),
      total_xp: 0,
      placeholder: true,
    },
    second: entries[1] ?? placeholderEntry(t),
    third: entries[2] ?? placeholderEntry(t),
  };
}

function PodiumSlot({
  entry,
  rank,
  barHeight,
  barWidth,
  isWinner,
  rankLabel,
  rankOpenLabel,
}: {
  entry: LeaderboardEntry;
  rank: 1 | 2 | 3;
  barHeight: string;
  barWidth: string;
  isWinner?: boolean;
  rankLabel: string;
  rankOpenLabel: string;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const isPlaceholder = entry.placeholder;

  return (
    <div
      className={`group flex w-24 shrink-0 flex-col items-center sm:w-28 ${isPlaceholder ? "opacity-70" : ""}`}
    >
      {isWinner && !isPlaceholder && (
        <MaterialIcon
          name="workspace_premium"
          className="text-secondary mb-1 animate-bounce"
          filled
          size={28}
        />
      )}
      {isPlaceholder && <div className="mb-1 h-7" aria-hidden />}
      <div className="relative mb-3">
        {isPlaceholder ? (
          <div className="border-outline-variant bg-surface-container-low flex size-16 items-center justify-center rounded-full border-2 border-dashed shadow-sm sm:size-16">
            <MaterialIcon
              name="person_add"
              className="text-on-surface-variant"
              size={28}
            />
          </div>
        ) : (
          <AvatarRing
            src={entry.avatar_url}
            name={entry.username}
            size="lg"
            ring={isWinner ? "secondary" : "neutral"}
            className={isWinner ? "!size-20" : "!size-16"}
          />
        )}
        {isWinner && !isPlaceholder && (
          <div className="bg-secondary-container text-on-secondary-container absolute -top-3 -end-3 flex size-8 items-center justify-center rounded-full border-2 border-white shadow-md">
            <MaterialIcon name="crown" filled size={16} />
          </div>
        )}
        {!isWinner && (
          <div className="bg-surface text-on-surface absolute -end-2 -bottom-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
            {rankLabel}
          </div>
        )}
      </div>
      <div
        className={`flex w-full flex-col items-center justify-end rounded-t-xl pb-2 ${barHeight} ${barWidth} ${
          isPlaceholder
            ? "border-outline-variant/40 bg-surface-container-high/50 border border-dashed"
            : isWinner
              ? "bg-primary text-primary-foreground"
              : rank === 2
                ? "bg-primary/40 text-on-primary-container"
                : "bg-primary/20 text-on-primary-container/70"
        }`}
      >
        <span className="text-label-md font-bold">
          {isPlaceholder ? tc("dash") : entry.total_xp}
        </span>
        <span className="text-[10px] uppercase opacity-80">{t("xp")}</span>
      </div>
      <p
        className={`text-label-md mt-2 max-w-full truncate text-center font-bold ${
          isPlaceholder
            ? "text-on-surface-variant"
            : isWinner
              ? "text-primary"
              : "text-on-surface"
        }`}
      >
        {isPlaceholder ? rankOpenLabel : entry.username}
      </p>
    </div>
  );
}

export function LeaderboardPodium({
  entries,
  leaderName,
}: {
  entries: LeaderboardEntry[];
  leaderName?: string;
}) {
  const t = useTranslations("dashboard");
  const tc = useTranslations("common");
  const hasRealLeader = entries.length > 0 && !entries[0]?.placeholder;
  const podium = buildPodium(entries, tc);

  const rankLabels = {
    1: t("rank1st"),
    2: t("rank2nd"),
    3: t("rank3rd"),
  } as const;

  if (!hasRealLeader && entries.length === 0) {
    return (
      <p className="text-on-surface-variant text-body-md">
        {t("noLeaderboard")}
      </p>
    );
  }

  return (
    <section
      id="leaderboard"
      className="bg-surface-container border-secondary-container relative mb-10 overflow-hidden rounded-3xl border-b-4 p-6 shadow-md md:p-10"
    >
      <div className="bg-secondary-container/20 pointer-events-none absolute top-0 end-0 -mt-16 -me-16 size-64 rounded-full blur-3xl" />
      <div className="relative z-10 flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1 lg:max-w-md lg:pe-8">
          <h1 className="text-headline-lg text-on-surface mb-2">
            {t("weeklyLeaderboard")}
          </h1>
          <p className="text-body-lg text-on-surface-variant">
            {leaderName
              ? t("leaderLeading", { name: leaderName })
              : t("leaderDefault")}
          </p>
        </div>
        <div className="flex shrink-0 items-end justify-center gap-4 pt-4 sm:gap-8 lg:pt-0">
          <PodiumSlot
            entry={podium.second}
            rank={2}
            barHeight="h-24"
            barWidth="min-h-24"
            rankLabel={rankLabels[2]}
            rankOpenLabel={t("rankOpen", { rank: rankLabels[2] })}
          />
          <PodiumSlot
            entry={podium.first}
            rank={1}
            barHeight="h-32"
            barWidth="min-h-32"
            isWinner={!podium.first.placeholder}
            rankLabel={rankLabels[1]}
            rankOpenLabel={t("rankOpen", { rank: rankLabels[1] })}
          />
          <PodiumSlot
            entry={podium.third}
            rank={3}
            barHeight="h-16"
            barWidth="min-h-16"
            rankLabel={rankLabels[3]}
            rankOpenLabel={t("rankOpen", { rank: rankLabels[3] })}
          />
        </div>
      </div>
    </section>
  );
}
