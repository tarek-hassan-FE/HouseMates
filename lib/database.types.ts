type HouseRole = "admin" | "member";

export type ChoreFrequency =
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "once";

export type ExpenseStrategy = "equal" | "exact";

export interface Profile {
  id: string;
  house_id: string | null;
  username: string;
  avatar_url: string | null;
  total_xp: number;
  current_level: number;
  house_role: HouseRole;
  created_at: string;
}

export interface House {
  id: string;
  name: string;
  invite_code: string;
  created_by: string | null;
  created_at: string;
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
  created_at: string;
  assignee?: { username: string } | null;
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
