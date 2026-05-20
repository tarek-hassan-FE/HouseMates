import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { ChoresList } from "@/components/chores/chores-list";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function ChoresPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const tc = await getTranslations("common");

  const { data: members } = await supabase
    .from("profiles")
    .select(
      "id, username, house_role, total_xp, current_level, house_id, avatar_url, created_at",
    )
    .eq("house_id", session.house.id);

  return (
    <Suspense
      fallback={
        <p className="text-on-surface-variant">{tc("loadingChores")}</p>
      }
    >
      <ChoresList members={members ?? []} />
    </Suspense>
  );
}
