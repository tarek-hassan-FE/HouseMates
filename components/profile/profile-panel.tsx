"use client";

import { ProfileActivityFeed } from "@/components/profile/profile-activity-feed";
import { ProfileDangerZone } from "@/components/profile/profile-danger-zone";
import { ProfileIdentityHeader } from "@/components/profile/profile-identity-header";
import { ProfileImpactStats } from "@/components/profile/profile-impact-stats";
import { ProfileQuickSettings } from "@/components/profile/profile-quick-settings";
import type { ProfileActivityItem } from "@/lib/profile/activity";
import type { XpTier } from "@/lib/profile/stats";

type ProfilePanelProps = {
  userId: string;
  profile: {
    username: string;
    avatar_url: string | null;
    total_xp: number;
    current_level: number;
    house_role: "admin" | "member";
    created_at: string;
    push_notifications_enabled: boolean;
    leaderboard_visible: boolean;
  };
  stats: {
    choresCompleted: number;
    totalXp: number;
    financialReliability: number;
    rank: number;
    memberCount: number;
    topPercent: boolean;
    xpTier: XpTier;
  };
  activity: ProfileActivityItem[];
};

export function ProfilePanel({ userId, profile, stats, activity }: ProfilePanelProps) {
  return (
    <div className="mx-auto w-full max-w-lg md:max-w-4xl">
      <ProfileIdentityHeader
        userId={userId}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        totalXp={profile.total_xp}
        currentLevel={profile.current_level}
        houseRole={profile.house_role}
        createdAt={profile.created_at}
        xpTier={stats.xpTier}
      />
      <ProfileImpactStats
        choresCompleted={stats.choresCompleted}
        totalXp={stats.totalXp}
        financialReliability={stats.financialReliability}
        topPercent={stats.topPercent}
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ProfileActivityFeed items={activity} />
        <ProfileQuickSettings
          userId={userId}
          username={profile.username}
          avatarUrl={profile.avatar_url}
          houseRole={profile.house_role}
          pushNotificationsEnabled={profile.push_notifications_enabled}
          leaderboardVisible={profile.leaderboard_visible}
        />
      </div>
      <ProfileDangerZone />
    </div>
  );
}
