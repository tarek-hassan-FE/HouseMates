-- Chore recurrence + rotation (run in SQL editor after migrations)
-- Expectations use UTC calendar boundaries.

-- chore_reactivates_at: daily → next calendar day midnight UTC
select
  public.chore_reactivates_at(
    'daily'::public.chore_frequency,
    '2025-05-07 15:30:00+00'::timestamptz
  ) = '2025-05-08 00:00:00+00'::timestamptz as daily_ok;

-- weekly → same weekday + 7 days
select
  public.chore_reactivates_at(
    'weekly'::public.chore_frequency,
    '2025-05-07 15:30:00+00'::timestamptz
  ) = '2025-05-14 00:00:00+00'::timestamptz as weekly_ok;

-- monthly → same day next month
select
  public.chore_reactivates_at(
    'monthly'::public.chore_frequency,
    '2025-01-31 12:00:00+00'::timestamptz
  ) = '2025-02-28 00:00:00+00'::timestamptz as monthly_ok;

-- once → null
select
  public.chore_reactivates_at(
    'once'::public.chore_frequency,
    now()
  ) is null as once_ok;

-- next_rotated_assignee: wrap from last member to first (requires test house + profiles)
-- Example manual setup:
--   insert two profiles in same house, then:
--   select public.next_rotated_assignee('<house_id>', '<user_a_id>');
--   should return user_b when user_a was last completer and user_b is next by username.
