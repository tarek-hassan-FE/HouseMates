"use client";

import { ProfileFinanceSnapshot } from "@/components/profile/profile-finance-snapshot";
import { ProfileHero } from "@/components/profile/profile-hero";
import { ProfileSettings } from "@/components/profile/profile-settings";

type ProfilePanelProps = {
  userId: string;
  profile: {
    username: string;
    avatar_url: string | null;
    total_xp: number;
    current_level: number;
  };
  finance: {
    netCents: number;
    youOweCents: number;
    youreOwedCents: number;
    memberCount: number;
  };
};

export function ProfilePanel({ userId, profile, finance }: ProfilePanelProps) {
  return (
    <div className="max-w-lg mx-auto w-full md:max-w-2xl">
      <ProfileHero
        userId={userId}
        username={profile.username}
        avatarUrl={profile.avatar_url}
        totalXp={profile.total_xp}
        currentLevel={profile.current_level}
      />
      <ProfileFinanceSnapshot
        netCents={finance.netCents}
        youOweCents={finance.youOweCents}
        youreOwedCents={finance.youreOwedCents}
        memberCount={finance.memberCount}
      />
      <ProfileSettings username={profile.username} />
    </div>
  );
}
