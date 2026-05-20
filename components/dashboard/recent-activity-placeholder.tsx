"use client";

import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { AvatarRing } from "@/components/design/avatar-ring";
import { XpBadge } from "@/components/design/xp-badge";

type ActivityRow = {
  username: string;
  avatar_url?: string | null;
  time: string;
  type: "chore" | "shopping";
  xp?: number;
};

export function RecentActivityPlaceholder({
  rows,
}: {
  rows: ActivityRow[];
}) {
  const t = useTranslations("dashboard");

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-headline-md text-on-surface">{t("recentActivity")}</h3>
        <span
          className="text-label-md text-primary font-bold opacity-50"
          aria-disabled
        >
          View All
        </span>
      </div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={i}
            className="border-outline-variant/30 flex flex-col gap-2 rounded-2xl border bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex min-w-0 items-center gap-4">
              <AvatarRing
                src={row.avatar_url}
                name={row.username}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-body-md text-on-surface">
                  {row.type === "chore"
                    ? t.rich("activityChore", {
                        bold: (chunks) => (
                          <span className="font-bold">{chunks}</span>
                        ),
                        username: row.username,
                        place: t("kitchen"),
                      })
                    : t.rich("activityShopping", {
                        bold: (chunks) => (
                          <span className="font-bold">{chunks}</span>
                        ),
                        username: row.username,
                        item: t("laundryDetergent"),
                      })}
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  {row.time}
                </p>
              </div>
            </div>
            {row.type === "chore" && row.xp != null ? (
              <XpBadge xp={row.xp} />
            ) : (
              <MaterialIcon
                name="shopping_bag"
                className="text-on-surface-variant"
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-label-sm text-on-surface-variant mt-3">
        Sample activity — full feed coming soon.
      </p>
    </section>
  );
}
