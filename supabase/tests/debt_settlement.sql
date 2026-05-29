-- Manual creditor-only settlement verification (run after: npx supabase db reset)
-- Replace UUIDs with test user IDs from auth.users after signing up three users in one house.

-- Setup: User A (creditor/payer), User B and User C (debtors) in the same house.
--   select id, email from auth.users;
--   select id, username, house_id from profiles;

-- 1. As User A, create an equal-split expense:
--    select create_expense_with_equal_split('Dinner', 3000, 'ledger');
--    select id, payer_id from expenses order by created_at desc limit 1;
--    select debtor_id, creditor_id, amount_cents, settled_at from debt_ledger where settled_at is null;

-- 2. As debtor User B, bilateral settle with A must fail:
--    select settle_bilateral_debts('<user_a_uuid>');
--    Expected: ERROR 'Nothing to settle'

-- 3. As creditor User A, bilateral settle with B clears only B -> A rows:
--    select settle_bilateral_debts('<user_b_uuid>');
--    select debtor_id, creditor_id, settled_at from debt_ledger
--      where debtor_id = '<user_b_uuid>' or creditor_id = '<user_b_uuid>';

-- 4. As debtor User B, settle all must fail:
--    select settle_all_house_debts();
--    Expected: ERROR 'Nothing to settle'

-- 5. As creditor User A, settle expense marks only rows where creditor_id = A:
--    select settle_expense_debts('<expense_id>');
--    select debtor_id, creditor_id, settled_at from debt_ledger where expense_id = '<expense_id>';

-- 6. Direct update as debtor must be denied (debt_ledger_update policy removed):
--    update debt_ledger set settled_at = now()
--      where debtor_id = auth.uid() and settled_at is null;
--    Expected: permission denied or 0 rows (no update policy)

-- 7. Non-admin expense delete must fail:
--    delete from expenses where id = '<expense_id>';
--    Expected: 0 rows (RLS blocks non-admin)
