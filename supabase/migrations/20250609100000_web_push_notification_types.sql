-- Enum values must be committed before use in functions (separate migration).

alter type public.notification_type add value if not exists 'chore_assigned';
alter type public.notification_type add value if not exists 'chore_completed';
alter type public.notification_type add value if not exists 'expense_added';
alter type public.notification_type add value if not exists 'chore_reminder';
alter type public.notification_type add value if not exists 'reward_redeemed';
