export type SystemStats = {
  generated_at: string;
  limits: {
    max_users: number;
    max_houses: number;
    user_count: number;
    house_count: number;
    signup_open: boolean;
    onboarding_open: boolean;
    users_used_pct: number;
    houses_used_pct: number;
  };
  users: {
    total: number;
    with_house: number;
    without_house: number;
    created_last_7d: number;
    created_last_30d: number;
  };
  houses: {
    total: number;
    created_last_7d: number;
    created_last_30d: number;
    avg_members: number;
  };
  chores: {
    total: number;
    completions_pending: number;
    completions_approved: number;
    completions_last_7d: number;
  };
  expenses: {
    total: number;
    total_amount_cents: number;
    ledger_count: number;
    shopping_count: number;
    last_7d_count: number;
    last_7d_amount_cents: number;
    last_30d_count: number;
  };
  debts: {
    total_entries: number;
    unsettled_count: number;
    unsettled_amount_cents: number;
  };
  notifications: {
    total: number;
    unread: number;
  };
  shopping: {
    items_total: number;
  };
  rewards: {
    redemptions_total: number;
    xp_spent_total: number;
  };
  top_houses: Array<{
    id: string;
    name: string;
    member_count: number;
    expense_count: number;
    created_at: string;
  }>;
};

export async function fetchSystemStats(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
): Promise<SystemStats | null> {
  const { data, error } = await supabase.rpc("get_system_stats");

  if (error || !data) {
    return null;
  }

  return data as SystemStats;
}
