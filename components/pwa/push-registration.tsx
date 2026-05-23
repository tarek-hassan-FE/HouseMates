"use client";

import { useEffect } from "react";
import {
  enablePushNotifications,
  isPushSupported,
} from "@/lib/push-client";

type PushRegistrationProps = {
  pushEnabled: boolean;
};

export function PushRegistration({ pushEnabled }: PushRegistrationProps) {
  useEffect(() => {
    if (!pushEnabled || !isPushSupported()) return;
    if (Notification.permission !== "granted") return;

    void enablePushNotifications().catch(() => {
      // Subscription refresh failed silently; user can re-toggle in profile.
    });
  }, [pushEnabled]);

  return null;
}
