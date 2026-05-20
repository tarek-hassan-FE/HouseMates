-- Manual RLS verification (run after: npx supabase db reset)
-- Replace UUIDs with test user IDs from auth.users after signing up two users.

-- 1. User A creates house via RPC (as authenticated User A):
--    select * from create_house('Test House');

-- 2. User B joins via invite code:
--    select join_house('INVITECODE');

-- 3. Confirm both profiles share house_id:
--    select id, username, house_id from profiles;

-- 4. As User A, chores in house should be visible; other houses invisible:
--    select * from chores;

-- 5. Attempt to read another house (should return 0 rows under RLS):
--    select * from houses where id <> (select house_id from profiles where id = auth.uid());
