type HouseRole = "admin" | "member";

export type ChoreFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "once";

export type ExpenseStrategy = "equal" | "exact";

export type ExpenseSource = "ledger" | "shopping";

export type NotificationType = "payment_reminder";

export interface Notification {
  id: string;
  house_id: string;
  recipient_id: string;
  actor_id: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: { amount_cents?: number };
  read_at: string | null;
  created_at: string;
  actor?: { username: string } | null;
}

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
  proof_image_url?: string | null;
}

export interface Chore {
  id: string;
  house_id: string;
  title: string;
  description: string | null;
  xp_reward: number;
  frequency: ChoreFrequency;
  rotate_assignment: boolean;
  reactivates_at: string | null;
  assigned_to: string | null;
  last_completed_at: string | null;
  last_completed_by: string | null;
  last_proof_image_url?: string | null;
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
  source: ExpenseSource;
  receipt_url?: string | null;
  created_at: string;
  payer?: { username: string } | null;
}

export interface HouseReward {
  id: string;
  house_id: string;
  preset_key: string | null;
  title: string;
  description: string | null;
  xp_cost: number;
  icon: string;
  gradient: string | null;
  image_url: string | null;
  is_enabled: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  house_id: string;
  profile_id: string;
  reward_key: string;
  house_reward_id: string | null;
  xp_spent: number;
  created_at: string;
  profile?: { username: string } | null;
  house_reward?: { title: string } | null;
}

export interface ShoppingListItem {
  id: string;
  house_id: string;
  title: string;
  created_by: string;
  created_at: string;
  creator?: { username: string } | null;
}
