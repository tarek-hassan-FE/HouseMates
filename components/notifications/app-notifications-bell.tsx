"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { MaterialIcon } from "@/components/design/material-icon";
import { useNotifications } from "@/components/providers/notifications-provider";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

export function AppNotificationsBell() {
  const t = useTranslations("nav");
  const { unreadCount, dropdownOpen, setDropdownOpen } = useNotifications();
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className={`btn-press relative flex size-11 items-center justify-center transition-colors ${
          dropdownOpen
            ? "bg-primary/10 text-primary"
            : "text-on-surface-variant hover:text-primary-container"
        }`}
        aria-label={t("notifications")}
        aria-expanded={dropdownOpen}
        aria-haspopup="menu"
        aria-controls="notifications-dropdown"
      >
        <MaterialIcon name="notifications" />
        {unreadCount > 0 && (
          <span className="bg-error text-primary-foreground absolute -top-0.5 end-0 flex min-w-[18px] items-center justify-center rounded-full px-1 py-0.5 text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
      <NotificationsDropdown anchorRef={buttonRef} />
    </div>
  );
}
