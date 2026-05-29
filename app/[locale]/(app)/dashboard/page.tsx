import { Suspense } from "react";
import { SupportSectionCard } from "@/components/dashboard/buy-coffee-card";
import {
  DashboardActivitySection,
  DashboardMainGridSection,
  DashboardPodiumSection,
} from "@/components/dashboard/dashboard-sections";
import {
  DashboardActivitySkeleton,
  DashboardMainGridSkeleton,
  DashboardPodiumSkeleton,
} from "@/components/app/page-skeletons";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";
import { requireHouseSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireHouseSession();
  const supabase = await createClient();

  await supabase.rpc("reactivate_due_chores", {
    p_house_id: session.house.id,
  });

  return (
    <>
      <InstallAppPrompt />
      <SupportSectionCard />
      <Suspense fallback={<DashboardPodiumSkeleton />}>
        <DashboardPodiumSection />
      </Suspense>

      <Suspense fallback={<DashboardMainGridSkeleton />}>
        <DashboardMainGridSection />
      </Suspense>

      <Suspense fallback={<DashboardActivitySkeleton />}>
        <DashboardActivitySection />
      </Suspense>
    </>
  );
}
