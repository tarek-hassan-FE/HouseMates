"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { useNotifications } from "@/components/providers/notifications-provider";
import { NotificationRow } from "@/components/notifications/notification-row";

type DropdownPosition = {
  top: number;
  left?: number;
  right?: number;
  width: number;
};

function useDropdownPosition(
  anchorRef: React.RefObject<HTMLButtonElement | null>,
  open: boolean,
): DropdownPosition | null {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) {
      setPosition(null);
      return;
    }

    function update() {
      const el = anchorRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - 16);
      const isRtl = document.documentElement.dir === "rtl";
      const top = rect.bottom + 8;

      if (isRtl) {
        setPosition({
          top,
          left: Math.max(8, rect.left),
          width,
        });
      } else {
        setPosition({
          top,
          right: Math.max(8, window.innerWidth - rect.right),
          width,
        });
      }
    }

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [anchorRef, open]);

  return position;
}

export function NotificationsDropdown({
  anchorRef,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const t = useTranslations("notifications");
  const {
    notifications,
    unreadCount,
    dropdownOpen,
    setDropdownOpen,
    markRead,
    markAllRead,
  } = useNotifications();

  const panelRef = useRef<HTMLDivElement>(null);
  const position = useDropdownPosition(anchorRef, dropdownOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setDropdownOpen(false);
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [dropdownOpen, setDropdownOpen]);

  useEffect(() => {
    if (!dropdownOpen) return;

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setDropdownOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [dropdownOpen, setDropdownOpen, anchorRef]);

  if (!mounted || !dropdownOpen || !position) return null;

  const hasUnread = notifications.some((n) => n.read_at == null);

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[90]"
        aria-hidden
        onClick={() => setDropdownOpen(false)}
      />
      <div
        ref={panelRef}
        id="notifications-dropdown"
        role="menu"
        aria-label={t("title")}
        className="border-outline-variant/20 bg-surface-container-lowest fixed z-[100] flex max-h-[min(24rem,70dvh)] flex-col overflow-hidden rounded-2xl border shadow-xl"
        style={{
          top: position.top,
          left: position.left,
          right: position.right,
          width: position.width,
        }}
      >
        <div className="border-outline-variant/15 flex items-center justify-between gap-2 border-b px-4 py-3">
          <div className="min-w-0">
            <h2 className="text-label-lg text-on-surface font-bold">
              {t("title")}
            </h2>
            {unreadCount > 0 && (
              <p className="text-label-sm text-on-surface-variant">
                {t("unreadCount", { count: unreadCount })}
              </p>
            )}
          </div>
          {hasUnread && (
            <button
              type="button"
              onClick={() => void markAllRead()}
              className="text-label-sm text-primary shrink-0 font-bold hover:underline"
            >
              {t("markAllRead")}
            </button>
          )}
        </div>

        <ul className="divide-outline-variant/10 flex-1 divide-y overflow-y-auto overscroll-contain">
          {notifications.length === 0 ? (
            <li className="text-on-surface-variant px-4 py-10 text-center text-sm">
              {t("empty")}
            </li>
          ) : (
            notifications.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onRead={(id) => void markRead([id])}
                onNavigate={() => setDropdownOpen(false)}
              />
            ))
          )}
        </ul>
      </div>
    </>,
    document.body,
  );
}
