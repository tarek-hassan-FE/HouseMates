"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useRouter } from "@/i18n/navigation";
import type { Notification } from "@/lib/database.types";
import {
  markAllNotificationsReadAction,
  markNotificationsReadAction,
} from "@/app/[locale]/(app)/notifications/actions";

type NotificationsContextValue = {
  notifications: Notification[];
  unreadCount: number;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  markRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  setUnreadCount: (count: number) => void;
  setNotifications: (items: Notification[]) => void;
};

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

export function NotificationsProvider({
  children,
  initialNotifications,
  initialUnreadCount,
}: {
  children: React.ReactNode;
  initialNotifications: Notification[];
  initialUnreadCount: number;
}) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const applyReadLocally = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    const now = new Date().toISOString();

    setNotifications((prev) => {
      const newlyRead = prev.filter(
        (n) => idSet.has(n.id) && n.read_at == null,
      ).length;
      setUnreadCount((c) => Math.max(0, c - newlyRead));
      return prev.map((n) =>
        idSet.has(n.id) ? { ...n, read_at: now } : n,
      );
    });
  }, []);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      const result = await markNotificationsReadAction(ids);
      if (!result.success) return;

      applyReadLocally(ids);
      router.refresh();
    },
    [applyReadLocally, router],
  );

  const markAllRead = useCallback(async () => {
    const result = await markAllNotificationsReadAction();
    if (!result.success) return;

    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.read_at == null ? { ...n, read_at: now } : n)),
    );
    setUnreadCount(0);
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      dropdownOpen,
      setDropdownOpen,
      markRead,
      markAllRead,
      setUnreadCount,
      setNotifications,
    }),
    [notifications, unreadCount, dropdownOpen, markRead, markAllRead],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within NotificationsProvider");
  }
  return ctx;
}
