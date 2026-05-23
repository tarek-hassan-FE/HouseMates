-- Web push notification helpers (run after migrations)

-- chore_reactivates_at spot check (from recurrence migration)
select public.chore_reactivates_at(
  'daily'::public.chore_frequency,
  '2025-05-07 15:30:00+00'::timestamptz
) = '2025-05-08 00:00:00+00'::timestamptz as daily_ok;

-- should_send_chore_reminder: daily active chore
select public.should_send_chore_reminder(
  gen_random_uuid(),
  gen_random_uuid(),
  gen_random_uuid(),
  'daily'::public.chore_frequency,
  now() - interval '2 days',
  null,
  null,
  now()
) as daily_active_ok;

-- create_notification skips self except chore_reminder
-- (manual: verify with two profile fixtures in house)
