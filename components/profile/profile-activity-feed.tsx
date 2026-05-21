"use client";

import { useLocale, useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { Link } from "@/i18n/navigation";
import type { ProfileActivityItem } from "@/lib/profile/activity";
import { intlLocale } from "@/lib/format";

function formatActivityTime(iso: string, locale: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const time = d.toLocaleTimeString(intlLocale(locale), {
    hour: "numeric",
    minute: "2-digit",
  });

  if (isToday) return `${locale === "ar" ? "اليوم" : "Today"}, ${time}`;
  if (isYesterday) return `${locale === "ar" ? "أمس" : "Yesterday"}, ${time}`;
  return d.toLocaleString(intlLocale(locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function activityIcon(item: ProfileActivityItem): string {
  if (item.kind === "expense") return "receipt_long";
  return "cleaning_services";
}

function activityIconStyles(item: ProfileActivityItem): string {
  if (item.kind === "expense") {
    return "bg-primary/10 text-primary";
  }
  return "bg-tertiary/10 text-tertiary";
}

type ProfileActivityFeedProps = {
  items: ProfileActivityItem[];
};

export function ProfileActivityFeed({ items }: ProfileActivityFeedProps) {
  const locale = useLocale();
  const t = useTranslations("profile");

  return (
    <section className="border-outline-variant/30 mb-6 overflow-hidden rounded-xl border bg-white shadow-sm lg:col-span-8">
      <div className="border-outline-variant/20 flex items-center justify-between border-b p-4 md:p-6">
        <h3 className="text-headline-md text-on-surface font-semibold">
          {t("recentContributions")}
        </h3>
        <Link
          href="/chores"
          className="text-label-md text-primary font-semibold hover:underline"
        >
          {t("viewAll")}
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-body-md text-on-surface-variant p-6">
          {t("noActivity")}
        </p>
      ) : (
        <ul className="divide-outline-variant/10 divide-y">
          {items.map((item) => (
            <li
              key={item.id}
              className="hover:bg-surface-container-low flex items-center justify-between gap-3 p-4 transition-colors"
            >
              <div className="flex min-w-0 items-center gap-4">
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full ${activityIconStyles(item)}`}
                >
                  <MaterialIcon name={activityIcon(item)} size={22} />
                </span>
                <div className="min-w-0">
                  <h4 className="text-label-md text-on-surface truncate font-semibold">
                    {item.title}
                  </h4>
                  <p className="text-label-sm text-on-surface-variant">
                    {formatActivityTime(item.occurredAt, locale)}
                  </p>
                </div>
              </div>
              {item.kind === "chore" && item.xpReward != null && (
                <span className="text-tertiary shrink-0 font-bold">
                  +{item.xpReward} XP
                </span>
              )}
              {item.kind === "expense" && item.settled && (
                <span className="bg-surface-container-high text-on-surface-variant text-label-sm shrink-0 rounded-full px-2 py-1 font-bold">
                  {t("settled")}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
