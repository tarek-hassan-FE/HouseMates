"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { AvatarRing } from "@/components/design/avatar-ring";
import { ImageViewerDialog } from "@/components/shared/image-viewer-dialog";
import type { HouseActivityKind } from "@/lib/house/activity";

export type DashboardActivityRow = {
  id: string;
  kind: HouseActivityKind;
  username: string;
  avatar_url?: string | null;
  time: string;
  title: string;
  amountDisplay?: string;
  xpReward?: number;
  imageUrl?: string | null;
};

function activityIcon(kind: HouseActivityKind): string {
  switch (kind) {
    case "chore_completed":
      return "cleaning_services";
    case "shopping_list_added":
      return "add_shopping_cart";
    case "expense_added":
      return "receipt_long";
    case "purchase_completed":
      return "shopping_bag";
  }
}

export function RecentActivityPlaceholder({
  rows,
}: {
  rows: DashboardActivityRow[];
}) {
  const t = useTranslations("dashboard");
  const [viewer, setViewer] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const bold = (chunks: ReactNode) => (
    <span className="font-bold">{chunks}</span>
  );

  function activityMessage(row: DashboardActivityRow) {
    switch (row.kind) {
      case "chore_completed":
        return t.rich("activityChoreCompleted", {
          bold,
          username: row.username,
          chore: row.title,
        });
      case "shopping_list_added":
        return t.rich("activityListItemAdded", {
          bold,
          username: row.username,
          item: row.title,
        });
      case "expense_added":
        return t.rich("activityExpenseAdded", {
          bold,
          username: row.username,
          title: row.title,
        });
      case "purchase_completed":
        return t.rich("activityPurchaseCompleted", {
          bold,
          username: row.username,
          item: row.title,
        });
    }
  }

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
      {rows.length === 0 ? (
        <p className="text-body-md text-on-surface-variant rounded-2xl border border-outline-variant/30 bg-white/50 p-4">
          {t("noRecentActivity")}
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.id}
              className="border-outline-variant/30 flex flex-col gap-2 rounded-2xl border bg-white/50 p-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-center gap-4">
                <AvatarRing
                  src={row.avatar_url}
                  name={row.username}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-body-md text-on-surface">
                    {activityMessage(row)}
                    {row.amountDisplay &&
                      (row.kind === "expense_added" ||
                        row.kind === "purchase_completed") && (
                        <span className="text-on-surface-variant">
                          {t("activityAmount", { amount: row.amountDisplay })}
                        </span>
                      )}
                  </p>
                  <p className="text-label-sm text-on-surface-variant">
                    {row.time}
                  </p>
                </div>
                {row.imageUrl && (
                  <button
                    type="button"
                    onClick={() =>
                      setViewer({ url: row.imageUrl!, title: row.title })
                    }
                    className="relative size-10 shrink-0 overflow-hidden rounded-lg ring-1 ring-outline-variant/40"
                    aria-label={row.title}
                  >
                    <Image
                      src={row.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="40px"
                    />
                  </button>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                {row.kind === "chore_completed" && row.xpReward != null && (
                  <span className="text-label-md text-tertiary font-bold">
                    +{row.xpReward} XP
                  </span>
                )}
                <MaterialIcon
                  name={activityIcon(row.kind)}
                  className="text-on-surface-variant"
                />
              </div>
            </div>
          ))}
        </div>
      )}
      <ImageViewerDialog
        open={viewer != null}
        imageUrl={viewer?.url ?? null}
        title={viewer?.title}
        onClose={() => setViewer(null)}
      />
    </section>
  );
}
