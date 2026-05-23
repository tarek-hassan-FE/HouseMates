"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { formatDate } from "@/lib/format";
import type { Notification, NotificationType } from "@/lib/database.types";

function notificationIcon(type: NotificationType): string {
  switch (type) {
    case "payment_reminder":
      return "payments";
    case "chore_assigned":
      return "assignment_ind";
    case "chore_completed":
      return "task_alt";
    case "expense_added":
      return "receipt_long";
    case "chore_reminder":
      return "alarm";
    case "reward_redeemed":
      return "redeem";
    default:
      return "notifications";
  }
}

function notificationHref(notification: Notification): string | null {
  if (notification.payload.path) {
    return notification.payload.path;
  }
  switch (notification.type) {
    case "payment_reminder":
    case "expense_added":
      return "/ledger";
    case "chore_assigned":
    case "chore_completed":
    case "chore_reminder":
      return "/chores";
    case "reward_redeemed":
      return "/rewards";
    default:
      return null;
  }
}

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

  const icon = notificationIcon(notification.type);
  const href = notificationHref(notification);

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
                : notification.type === "chore_assigned"
                  ? t("choreAssigned")
                  : notification.type === "chore_completed"
                    ? t("choreCompleted")
                    : notification.type === "expense_added"
                      ? t("expenseAdded")
                      : notification.type === "chore_reminder"
                        ? t("choreReminder")
                        : notification.type === "reward_redeemed"
                          ? t("rewardRedeemed")
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
          {href && (
            <Link
              href={href}
              onClick={() => {
                if (isUnread) onRead(notification.id);
                onNavigate?.();
              }}
              className="text-label-sm text-primary mt-1.5 inline-flex items-center gap-0.5 font-bold hover:underline"
            >
              {notification.type === "payment_reminder" ||
              notification.type === "expense_added"
                ? t("viewLedger")
                : notification.type === "reward_redeemed"
                  ? t("viewRewards")
                  : t("viewChores")}
              <MaterialIcon name="arrow_forward" size={14} />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
