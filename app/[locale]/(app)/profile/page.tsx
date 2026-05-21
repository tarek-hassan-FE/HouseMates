import { getTranslations } from "next-intl/server";
import { ProfilePanel } from "@/components/profile/profile-panel";
import { requireHouseSession } from "@/lib/auth/session";
import {
  netBalanceCents,
  sumYouOweCents,
  sumYoureOwedCents,
} from "@/lib/ledger-balances";
import { createClient } from "@/lib/supabase/server";

export default async function ProfilePage() {
  const session = await requireHouseSession();
  const supabase = await createClient();
  const t = await getTranslations("profile");

  const [{ data: debts }, { count: memberCount }] = await Promise.all([
    supabase
      .from("debt_ledger")
      .select(
        "id, amount_cents, debtor_id, creditor_id, expense_id, settled_at",
      )
      .eq("house_id", session.house.id),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("house_id", session.house.id),
  ]);

  const debtRows = debts ?? [];
  const netCents = netBalanceCents(debtRows, session.userId);
  const youOweCents = sumYouOweCents(debtRows, session.userId);
  const youreOwedCents = sumYoureOwedCents(debtRows, session.userId);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-headline-lg text-on-surface">{t("title")}</h1>
        <p className="text-body-md text-on-surface-variant mt-2">
          {t("subtitle")}
        </p>
      </header>
      <ProfilePanel
        userId={session.userId}
        profile={{
          username: session.profile.username,
          avatar_url: session.profile.avatar_url,
          total_xp: session.profile.total_xp,
          current_level: session.profile.current_level,
        }}
        finance={{
          netCents,
          youOweCents,
          youreOwedCents,
          memberCount: memberCount ?? 0,
        }}
      />
    </>
  );
}
