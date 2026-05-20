import { getTranslations } from "next-intl/server";
import { SettingsPanel } from "@/components/settings/settings-panel";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const t = await getTranslations("settings");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, username, house_role, total_xp, current_level")
    .eq("house_id", session.house.id)
    .order("house_role", { ascending: true })
    .order("username", { ascending: true });

  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-lg text-on-surface">{t("title")}</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          {session.isAdmin ? t("adminSubtitle") : t("memberSubtitle")}
        </p>
      </header>
      <SettingsPanel members={members ?? []} currentUserId={session.userId} />
    </>
  );
}
