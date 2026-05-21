type HouseRole = "admin" | "member";

export type ChoreFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "once";

export type ExpenseStrategy = "equal" | "exact";

import type { HouseVaultData } from "@/lib/vault/types";

export interface Profile {
  id: string;
  house_id: string | null;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  house_role: HouseRole;
  vault_intro_seen?: boolean;
  push_notifications_enabled?: boolean;
  leaderboard_visible?: boolean;
  created_at: string;
}

export interface House {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
  vault_data: HouseVaultData;
}

export interface ChorePendingCompletion {
  id: string;
  submitted_by: string;
  submitted_at: string;
  status: "pending";
}

export interface Chore {
  id: string;
  house_id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: ChoreFrequency;
  assigned_to: string | null;
  last_completed_at: string | null;
  last_completed_by: string | null;
  created_at: string;
  assignee?: { username: string } | null;
  pending_completion?: ChorePendingCompletion | null;
}

export interface Expense {
  id: string;
  house_id: string;
  payer_id: string;
  title: string;
  amount_cents: number;
  strategy: ExpenseStrategy;
  created_at: string;
  payer?: { username: string } | null;
}

export interface RewardRedemption {
  id: string;
  house_id: string;
  profile_id: string;
  reward_key: string;
  xp_spent: number;
  created_at: string;
  profile?: { username: string } | null;
}

export interface ShoppingListItem {
  id: string;
  house_id: string;
  title: string;
  created_by: string;
  created_at: string;
  creator?: { username: string } | null;
}
