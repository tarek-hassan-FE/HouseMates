import { createClient } from "@/lib/supabase/server";
import type { House, Profile } from "@/lib/database.types";
import { parseVaultData } from "@/lib/vault/types";
import { redirect } from "next/navigation";

export type SessionContext = {
  userId: string;
  profile: Profile;
  house: House;
  isAdmin: boolean;
};

export async function requireHouseSession(): Promise<SessionContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, house_id, username, avatar_url, total_xp, current_level, house_role, vault_intro_seen, push_notifications_enabled, leaderboard_visible, created_at",
    )
    .eq("id", user.id)
    .single();

  if (!profile?.house_id) {
    redirect("/onboarding");
  }

  const { data: house } = await supabase
    .from("houses")
    .select("id, name, invite_code, created_by, created_at, vault_data")
    .eq("id", profile.house_id)
    .single();

  if (!house) {
    redirect("/onboarding");
  }

  return {
    userId: user.id,
    profile: profile as Profile,
    house: {
      ...(house as House),
      vault_data: parseVaultData(house.vault_data),
    },
    isAdmin: profile.house_role === "admin",
  };
}
