import { getTranslations } from "next-intl/server";
import { SystemDashboard } from "@/components/system/system-dashboard";
import { requireSystemAdmin } from "@/lib/auth/system-admin";
import { createClient } from "@/lib/supabase/server";
import { fetchSystemStats } from "@/lib/system/stats";

export default async function SystemDashboardPage() {
  await requireSystemAdmin();
  const t = await getTranslations("system");
  const supabase = await createClient();
  const stats = await fetchSystemStats(supabase);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-on-surface md:text-3xl">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-on-surface-variant">{t("pageDescription")}</p>
      </div>

      {stats ? (
        <SystemDashboard stats={stats} />
      ) : (
        <div className="rounded-xl bg-error-container px-4 py-3 text-sm text-on-surface">
          {t("loadError")}
        </div>
      )}
    </div>
  );
}
