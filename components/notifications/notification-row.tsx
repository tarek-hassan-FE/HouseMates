"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { formatDate } from "@/lib/format";
import type { Notification } from "@/lib/database.types";

export function NotificationRow({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate?: () => void;
}) {
  const locale = useLocale();
  const t = useTranslations("notifications");
  const isUnread = notification.read_at == null;

  const icon =
    notification.type === "payment_reminder"
      ? "payments"
      : "notifications";

  return (
    <li>
      <div
        className={`flex gap-3 px-4 py-3 transition-colors ${
          isUnread ? "bg-primary/5" : "hover:bg-surface-container-low/80"
        }`}
      >
        {isUnread && (
          <span
            className="bg-primary mt-2 size-2 shrink-0 rounded-full"
            aria-hidden
          />
        )}
        {!isUnread && <span className="size-2 shrink-0" aria-hidden />}
        <div
          className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${
            isUnread
              ? "bg-primary/15 text-primary"
              : "bg-surface-container text-on-surface-variant"
          }`}
        >
          <MaterialIcon name={icon} size={20} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-label-md text-on-surface font-bold">
              {notification.type === "payment_reminder"
                ? t("paymentReminder")
                : notification.title}
            </p>
            <time
              className="text-label-sm text-outline shrink-0"
              dateTime={notification.created_at}
            >
              {formatDate(notification.created_at, locale)}
            </time>
          </div>
          <p className="text-body-sm text-on-surface-variant mt-0.5 line-clamp-2">
            {notification.body}
          </p>
          {notification.type === "payment_reminder" && (
            <Link
              href="/ledger"
              onClick={() => {
                if (isUnread) onRead(notification.id);
                onNavigate?.();
              }}
              className="text-label-sm text-primary mt-1.5 inline-flex items-center gap-0.5 font-bold hover:underline"
            >
              {t("viewLedger")}
              <MaterialIcon name="arrow_forward" size={14} />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
