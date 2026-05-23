"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { ProfileToggle } from "@/components/profile/profile-toggle";
import { Button } from "@/components/ui/button";
import { updateProfilePreferencesAction } from "@/app/[locale]/(app)/profile/actions";
import {
  disablePushNotifications,
  enablePushNotifications,
  isIosSafari,
  isPushActiveInBrowser,
  isPushSupported,
  isStandalonePwa,
  getVapidPublicKey,
} from "@/lib/push-client";

type ProfileQuickSettingsProps = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  houseRole: "admin" | "member";
  pushNotificationsEnabled: boolean;
  leaderboardVisible: boolean;
};

export function ProfileQuickSettings({
  userId,
  username,
  avatarUrl,
  houseRole,
  pushNotificationsEnabled,
  leaderboardVisible,
}: ProfileQuickSettingsProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(pushNotificationsEnabled);
  const [leaderboardOn, setLeaderboardOn] = useState(leaderboardVisible);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    const activeInBrowser = isPushActiveInBrowser();
    setPushEnabled(pushNotificationsEnabled && activeInBrowser);
    setLeaderboardOn(leaderboardVisible);
  }, [pushNotificationsEnabled, leaderboardVisible]);

  function pushFailureMessage(err: unknown): string {
    if (err instanceof Error) {
      if (err.message.includes("NEXT_PUBLIC_VAPID_PUBLIC_KEY")) {
        return t("pushVapidMissing");
      }
      return err.message;
    }
    return t("pushSubscribeFailed");
  }

  async function savePreference(
    nextPush: boolean,
    nextLeaderboard: boolean,
  ) {
    const result = await updateProfilePreferencesAction(
      nextPush,
      nextLeaderboard,
    );
    if (!result.success) {
      setPushEnabled(pushNotificationsEnabled);
      setLeaderboardOn(leaderboardVisible);
      return false;
    }
    router.refresh();
    return true;
  }

  async function handlePushToggle(checked: boolean) {
    setPushError(null);
    setPrefsLoading(true);

    try {
      if (checked) {
        if (!isPushSupported()) {
          setPushError(t("pushUnsupported"));
          return;
        }
        if (!getVapidPublicKey()) {
          setPushError(t("pushVapidMissing"));
          return;
        }
        if (isIosSafari() && !isStandalonePwa()) {
          setPushError(t("pushIosInstallHint"));
          return;
        }
        const permission = await enablePushNotifications();
        if (permission === "denied") {
          setPushError(t("pushPermissionDenied"));
          return;
        }
        if (permission === "unsupported") {
          setPushError(t("pushUnsupported"));
          return;
        }

        const ok = await savePreference(true, leaderboardOn);
        if (!ok) {
          await disablePushNotifications();
          setPushEnabled(false);
          setPushError(t("pushSubscribeFailed"));
          return;
        }
        setPushEnabled(true);
      } else {
        await disablePushNotifications();
        const ok = await savePreference(false, leaderboardOn);
        if (!ok) {
          setPushEnabled(isPushActiveInBrowser() && pushNotificationsEnabled);
          setPushError(t("pushSubscribeFailed"));
          return;
        }
        setPushEnabled(false);
      }
    } catch (err) {
      setPushError(pushFailureMessage(err));
      setPushEnabled(isPushActiveInBrowser() && pushNotificationsEnabled);
      if (checked) {
        await disablePushNotifications().catch(() => undefined);
      }
    } finally {
      setPrefsLoading(false);
    }
  }

  return (
    <div className="space-y-6 lg:col-span-4">
      <section className="border-outline-variant/30 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-headline-md text-on-surface mb-4 font-semibold">
          {t("houseRole")}
        </h3>
        <div className="border-primary/20 bg-primary-container/10 flex items-center gap-4 rounded-xl border p-4">
          <span className="bg-primary text-on-primary flex size-11 shrink-0 items-center justify-center rounded-lg">
            <MaterialIcon
              name={houseRole === "admin" ? "account_balance" : "group"}
              size={24}
            />
          </span>
          <div>
            <h4 className="text-label-md text-primary font-semibold">
              {houseRole === "admin" ? t("houseAdmin") : t("houseMember")}
            </h4>
            <p className="text-label-sm text-on-surface-variant">
              {houseRole === "admin"
                ? t("houseAdminDesc")
                : t("houseMemberDesc")}
            </p>
          </div>
        </div>
      </section>

      <section className="border-outline-variant/30 rounded-xl border bg-white p-6 shadow-sm">
        <h3 className="text-headline-md text-on-surface mb-4 font-semibold">
          {t("quickSettings")}
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <MaterialIcon
                name="notifications_active"
                className="text-on-surface-variant shrink-0"
                size={22}
              />
              <span className="text-label-md text-on-surface font-semibold">
                {t("pushNotifications")}
              </span>
            </div>
            <ProfileToggle
              label={t("pushNotifications")}
              checked={pushEnabled}
              disabled={prefsLoading}
              onCheckedChange={(checked) => {
                void handlePushToggle(checked);
              }}
            />
          </div>
          {pushError && (
            <p className="text-destructive text-label-sm" role="alert">
              {pushError}
            </p>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <MaterialIcon
                name="visibility"
                className="text-on-surface-variant shrink-0"
                size={22}
              />
              <span className="text-label-md text-on-surface font-semibold">
                {t("publicLeaderboard")}
              </span>
            </div>
            <ProfileToggle
              label={t("publicLeaderboard")}
              checked={leaderboardOn}
              disabled={prefsLoading}
              onCheckedChange={(checked) => {
                setLeaderboardOn(checked);
                setPrefsLoading(true);
                void savePreference(pushEnabled, checked).then((ok) => {
                  setPrefsLoading(false);
                  if (!ok) setLeaderboardOn(leaderboardVisible);
                });
              }}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="border-primary text-primary hover:bg-primary-container/10 w-full rounded-xl font-bold"
            onClick={() => setEditOpen(true)}
          >
            {t("editFullProfile")}
          </Button>
        </div>
      </section>

      <ProfileEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        userId={userId}
        username={username}
        avatarUrl={avatarUrl}
      />
    </div>
  );
}
