export type PlatformCapacity = {
  max_users: number;
  max_houses: number;
  user_count: number;
  house_count: number;
  signup_open: boolean;
  onboarding_open: boolean;
};

export const BETA_USER_LIMIT_MESSAGE = "Beta is full: maximum 50 users";
export const BETA_HOUSE_LIMIT_MESSAGE = "Beta is full: maximum 10 houses";

export async function fetchPlatformCapacity(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
): Promise<PlatformCapacity | null> {
  const { data, error } = await supabase.rpc("get_platform_capacity");

  if (error || !data) {
    return null;
  }

  return data as PlatformCapacity;
}

export function mapPlatformErrorMessage(message: string): string | null {
  if (message.includes(BETA_USER_LIMIT_MESSAGE)) {
    return "betaUserLimit";
  }
  if (message.includes(BETA_HOUSE_LIMIT_MESSAGE)) {
    return "betaHouseLimit";
  }
  return null;
}
