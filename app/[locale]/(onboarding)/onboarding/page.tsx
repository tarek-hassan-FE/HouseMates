import { OnboardingForm } from "@/components/onboarding/onboarding-form";
import { fetchPlatformCapacity } from "@/lib/platform/capacity";
import { createClient } from "@/lib/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const capacity = await fetchPlatformCapacity(supabase);
  const onboardingOpen = capacity?.onboarding_open ?? true;

  return (
    <main className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <OnboardingForm onboardingOpen={onboardingOpen} />
    </main>
  );
}
