"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MaterialIcon } from "@/components/design/material-icon";
import { ProfileEditModal } from "@/components/profile/profile-edit-modal";
import { ProfileToggle } from "@/components/profile/profile-toggle";
import { Button } from "@/components/ui/button";
import { updateProfilePreferencesAction } from "@/app/[locale]/(app)/profile/actions";

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

  useEffect(() => {
    setPushEnabled(pushNotificationsEnabled);
    setLeaderboardOn(leaderboardVisible);
  }, [pushNotificationsEnabled, leaderboardVisible]);

  async function savePreference(
    nextPush: boolean,
    nextLeaderboard: boolean,
  ) {
    setPrefsLoading(true);
    const result = await updateProfilePreferencesAction(
      nextPush,
      nextLeaderboard,
    );
    setPrefsLoading(false);
    if (!result.success) {
      setPushEnabled(pushNotificationsEnabled);
      setLeaderboardOn(leaderboardVisible);
      return;
    }
    router.refresh();
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
                setPushEnabled(checked);
                void savePreference(checked, leaderboardOn);
              }}
            />
          </div>
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
                void savePreference(pushEnabled, checked);
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
