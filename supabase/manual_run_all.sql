-- =============================================================================
-- HouseMate Harmony — RUN IN SUPABASE SQL EDITOR (Dashboard → SQL → New query)
-- =============================================================================
-- Safe to re-run: uses IF NOT EXISTS / DROP IF EXISTS where possible.
-- If you already have tables, you can run only: manual_run_phase2_only.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PART 1: Schema (tables, enums, trigger)
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.chore_frequency AS ENUM (
    'daily', 'weekly', 'biweekly', 'monthly', 'once'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.expense_strategy AS ENUM ('equal', 'exact');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.houses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(trim(name)) >= 1),
  invite_code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  house_id uuid REFERENCES public.houses (id) ON DELETE SET NULL,
  username text NOT NULL CHECK (char_length(trim(username)) >= 2),
  avatar_url text,
  total_xp integer NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  current_level integer NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.chores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 1),
  description text,
  xp_reward integer NOT NULL DEFAULT 10 CHECK (xp_reward >= 0),
  frequency public.chore_frequency NOT NULL DEFAULT 'weekly',
  assigned_to uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  last_completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses (id) ON DELETE CASCADE,
  payer_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(trim(title)) >= 1),
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  strategy public.expense_strategy NOT NULL DEFAULT 'equal',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.debt_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses (id) ON DELETE CASCADE,
  debtor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  creditor_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  expense_id uuid REFERENCES public.expenses (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (debtor_id <> creditor_id)
);

ALTER TABLE public.debt_ledger
  ADD COLUMN IF NOT EXISTS expense_id uuid REFERENCES public.expenses (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS debt_ledger_expense_id_idx ON public.debt_ledger (expense_id);

CREATE INDEX IF NOT EXISTS houses_invite_code_idx ON public.houses (invite_code);
CREATE INDEX IF NOT EXISTS profiles_house_id_idx ON public.profiles (house_id);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_house_username_unique
  ON public.profiles (house_id, username) WHERE house_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS chores_house_id_idx ON public.chores (house_id);
CREATE INDEX IF NOT EXISTS expenses_house_id_idx ON public.expenses (house_id);
CREATE INDEX IF NOT EXISTS debt_ledger_house_id_idx ON public.debt_ledger (house_id);

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'username'), ''),
    split_part(new.email, '@', 1)
  );
  final_username := left(base_username, 24);
  IF char_length(final_username) < 2 THEN
    final_username := 'user' || left(replace(new.id::text, '-', ''), 6);
  END IF;
  INSERT INTO public.profiles (id, username) VALUES (new.id, final_username);
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -----------------------------------------------------------------------------
-- PART 2: Phase 2 columns (house roles)
-- -----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.house_role AS ENUM ('admin', 'member');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.houses
  ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS house_role public.house_role NOT NULL DEFAULT 'member';

-- -----------------------------------------------------------------------------
-- PART 3: Helper functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.user_house_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT house_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_house_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(
    (SELECT house_role = 'admin' FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.user_house_id() FROM public;
GRANT EXECUTE ON FUNCTION public.user_house_id() TO authenticated;
REVOKE ALL ON FUNCTION public.is_house_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_house_admin() TO authenticated;

-- -----------------------------------------------------------------------------
-- PART 4: RLS enable + policies
-- -----------------------------------------------------------------------------

ALTER TABLE public.houses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debt_ledger ENABLE ROW LEVEL SECURITY;

-- Drop all policies (idempotent reset)
DROP POLICY IF EXISTS "houses_select_own" ON public.houses;
DROP POLICY IF EXISTS "houses_update_admin" ON public.houses;
DROP POLICY IF EXISTS "profiles_select_housemates" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "chores_select" ON public.chores;
DROP POLICY IF EXISTS "chores_insert" ON public.chores;
DROP POLICY IF EXISTS "chores_update" ON public.chores;
DROP POLICY IF EXISTS "chores_delete" ON public.chores;
DROP POLICY IF EXISTS "chores_insert_admin" ON public.chores;
DROP POLICY IF EXISTS "chores_update_admin" ON public.chores;
DROP POLICY IF EXISTS "chores_update_member_complete" ON public.chores;
DROP POLICY IF EXISTS "chores_delete_admin" ON public.chores;
DROP POLICY IF EXISTS "expenses_select" ON public.expenses;
DROP POLICY IF EXISTS "expenses_insert" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_admin" ON public.expenses;
DROP POLICY IF EXISTS "debt_ledger_select" ON public.debt_ledger;
DROP POLICY IF EXISTS "debt_ledger_insert" ON public.debt_ledger;
DROP POLICY IF EXISTS "debt_ledger_update" ON public.debt_ledger;
DROP POLICY IF EXISTS "debt_ledger_delete" ON public.debt_ledger;

-- Houses
CREATE POLICY "houses_select_own" ON public.houses FOR SELECT TO authenticated
  USING (id = public.user_house_id());
CREATE POLICY "houses_update_admin" ON public.houses FOR UPDATE TO authenticated
  USING (id = public.user_house_id() AND public.is_house_admin())
  WITH CHECK (id = public.user_house_id() AND public.is_house_admin());

-- Profiles
CREATE POLICY "profiles_select_housemates" ON public.profiles FOR SELECT TO authenticated
  USING (house_id = public.user_house_id());
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Chores
CREATE POLICY "chores_select" ON public.chores FOR SELECT TO authenticated
  USING (house_id = public.user_house_id());
CREATE POLICY "chores_insert_admin" ON public.chores FOR INSERT TO authenticated
  WITH CHECK (house_id = public.user_house_id() AND public.is_house_admin());
CREATE POLICY "chores_update_admin" ON public.chores FOR UPDATE TO authenticated
  USING (house_id = public.user_house_id() AND public.is_house_admin())
  WITH CHECK (house_id = public.user_house_id() AND public.is_house_admin());
CREATE POLICY "chores_update_member_complete" ON public.chores FOR UPDATE TO authenticated
  USING (house_id = public.user_house_id() AND assigned_to = auth.uid() AND NOT public.is_house_admin())
  WITH CHECK (house_id = public.user_house_id() AND assigned_to = auth.uid());
CREATE POLICY "chores_delete_admin" ON public.chores FOR DELETE TO authenticated
  USING (house_id = public.user_house_id() AND public.is_house_admin());

-- Expenses
CREATE POLICY "expenses_select" ON public.expenses FOR SELECT TO authenticated
  USING (house_id = public.user_house_id());
CREATE POLICY "expenses_insert" ON public.expenses FOR INSERT TO authenticated
  WITH CHECK (house_id = public.user_house_id() AND payer_id = auth.uid());
CREATE POLICY "expenses_delete_admin" ON public.expenses FOR DELETE TO authenticated
  USING (house_id = public.user_house_id() AND public.is_house_admin());

-- Debt ledger
CREATE POLICY "debt_ledger_select" ON public.debt_ledger FOR SELECT TO authenticated
  USING (house_id = public.user_house_id());
CREATE POLICY "debt_ledger_insert" ON public.debt_ledger FOR INSERT TO authenticated
  WITH CHECK (house_id = public.user_house_id());
CREATE POLICY "debt_ledger_update" ON public.debt_ledger FOR UPDATE TO authenticated
  USING (house_id = public.user_house_id()) WITH CHECK (house_id = public.user_house_id());
CREATE POLICY "debt_ledger_delete" ON public.debt_ledger FOR DELETE TO authenticated
  USING (house_id = public.user_house_id());

-- -----------------------------------------------------------------------------
-- PART 5: RPCs (onboarding, chores, admin)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN RETURN; END IF;
  SELECT left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'username'), ''),
      split_part(email, '@', 1),
      'user' || left(replace(id::text, '-', ''), 6)
    ),
    24
  ) INTO v_username FROM auth.users WHERE id = v_user_id;
  IF v_username IS NULL OR char_length(v_username) < 2 THEN
    v_username := 'user' || left(replace(v_user_id::text, '-', ''), 6);
  END IF;
  INSERT INTO public.profiles (id, username) VALUES (v_user_id, v_username);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

CREATE OR REPLACE FUNCTION public.create_house(p_name text)
RETURNS TABLE (house_id uuid, invite_code text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_invite_code text;
  v_name text := trim(p_name);
  attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_user_profile();
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND public.profiles.house_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Already in a house';
  END IF;
  IF v_name IS NULL OR char_length(v_name) < 1 THEN RAISE EXCEPTION 'House name is required'; END IF;
  LOOP
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    BEGIN
      INSERT INTO public.houses (name, invite_code, created_by)
      VALUES (v_name, v_invite_code, v_user_id) RETURNING id INTO v_house_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF attempts >= 10 THEN RAISE EXCEPTION 'Could not generate invite code'; END IF;
    END;
  END LOOP;
  UPDATE public.profiles SET house_id = v_house_id, house_role = 'admin' WHERE id = v_user_id;
  RETURN QUERY SELECT v_house_id, v_invite_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.join_house(p_invite_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_code text := upper(trim(p_invite_code));
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  PERFORM public.ensure_user_profile();
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND house_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Already in a house';
  END IF;
  IF v_code IS NULL OR char_length(v_code) < 4 THEN RAISE EXCEPTION 'Invalid invite code'; END IF;
  SELECT id INTO v_house_id FROM public.houses WHERE invite_code = v_code;
  IF v_house_id IS NULL THEN RAISE EXCEPTION 'House not found'; END IF;
  UPDATE public.profiles SET house_id = v_house_id, house_role = 'member' WHERE id = v_user_id;
  RETURN v_house_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_chore(p_chore_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp integer;
  v_assigned_to uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT house_id, xp_reward, assigned_to INTO v_house_id, v_xp, v_assigned_to
  FROM public.chores WHERE id = p_chore_id;
  IF v_house_id IS NULL THEN RAISE EXCEPTION 'Chore not found'; END IF;
  IF v_house_id <> public.user_house_id() THEN RAISE EXCEPTION 'Chore not in your house'; END IF;
  IF NOT public.is_house_admin() AND v_assigned_to <> v_user_id THEN
    RAISE EXCEPTION 'You can only complete chores assigned to you';
  END IF;
  UPDATE public.chores SET last_completed_at = now() WHERE id = p_chore_id;
  UPDATE public.profiles SET total_xp = total_xp + v_xp WHERE id = coalesce(v_assigned_to, v_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_house_name(p_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_name text := trim(p_name);
BEGIN
  IF NOT public.is_house_admin() THEN RAISE EXCEPTION 'Only house admins can rename the house'; END IF;
  IF v_name IS NULL OR char_length(v_name) < 1 THEN RAISE EXCEPTION 'House name is required'; END IF;
  UPDATE public.houses SET name = v_name WHERE id = public.user_house_id();
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_invite_code()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_id uuid := public.user_house_id();
  v_invite_code text;
  attempts integer := 0;
BEGIN
  IF NOT public.is_house_admin() THEN RAISE EXCEPTION 'Only house admins can regenerate invite codes'; END IF;
  LOOP
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    BEGIN
      UPDATE public.houses SET invite_code = v_invite_code WHERE id = v_house_id;
      RETURN v_invite_code;
    EXCEPTION WHEN unique_violation THEN
      IF attempts >= 10 THEN RAISE EXCEPTION 'Could not generate invite code'; END IF;
    END;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_house_member(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_house_id uuid := public.user_house_id();
  v_admin_count integer;
BEGIN
  IF NOT public.is_house_admin() THEN RAISE EXCEPTION 'Only house admins can remove members'; END IF;
  IF p_user_id = auth.uid() THEN
    SELECT count(*) INTO v_admin_count FROM public.profiles
    WHERE house_id = v_house_id AND house_role = 'admin';
    IF v_admin_count <= 1 THEN RAISE EXCEPTION 'Transfer admin role before leaving as the only admin'; END IF;
  END IF;
  UPDATE public.profiles SET house_id = null, house_role = 'member'
  WHERE id = p_user_id AND house_id = v_house_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Member not found in your house'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.transfer_house_admin(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_house_id uuid := public.user_house_id();
BEGIN
  IF NOT public.is_house_admin() THEN RAISE EXCEPTION 'Only house admins can transfer admin role'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION 'Cannot transfer admin to yourself'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND house_id = v_house_id) THEN
    RAISE EXCEPTION 'Member not found in your house';
  END IF;
  UPDATE public.profiles SET house_role = 'member' WHERE id = auth.uid();
  UPDATE public.profiles SET house_role = 'admin' WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_house(text) FROM public;
REVOKE ALL ON FUNCTION public.join_house(text) FROM public;
REVOKE ALL ON FUNCTION public.complete_chore(uuid) FROM public;
REVOKE ALL ON FUNCTION public.update_house_name(text) FROM public;
REVOKE ALL ON FUNCTION public.regenerate_invite_code() FROM public;
REVOKE ALL ON FUNCTION public.remove_house_member(uuid) FROM public;
REVOKE ALL ON FUNCTION public.transfer_house_admin(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.create_house(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_house(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_chore(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_house_name(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_invite_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_house_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_house_admin(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_expense_with_equal_split(
  p_title text,
  p_amount_cents integer
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_expense_id uuid;
  v_member_ids uuid[];
  v_debtor_ids uuid[];
  v_n integer;
  v_base_share integer;
  v_remainder integer;
  v_debtor_count integer;
  v_idx integer;
  v_extra integer;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  v_house_id := public.user_house_id();
  IF v_house_id IS NULL THEN RAISE EXCEPTION 'Join a house first'; END IF;
  p_title := trim(p_title);
  IF p_title = '' THEN RAISE EXCEPTION 'Title required'; END IF;
  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  INSERT INTO public.expenses (house_id, payer_id, title, amount_cents, strategy)
  VALUES (v_house_id, v_user_id, p_title, p_amount_cents, 'equal')
  RETURNING id INTO v_expense_id;
  SELECT coalesce(array_agg(id ORDER BY id), '{}') INTO v_member_ids
  FROM public.profiles WHERE house_id = v_house_id;
  v_n := coalesce(array_length(v_member_ids, 1), 0);
  IF v_n <= 1 THEN RETURN v_expense_id; END IF;
  v_base_share := p_amount_cents / v_n;
  v_remainder := p_amount_cents - v_base_share * v_n;
  SELECT coalesce(array_agg(m ORDER BY m), '{}') INTO v_debtor_ids
  FROM unnest(v_member_ids) AS m WHERE m <> v_user_id;
  v_debtor_count := coalesce(array_length(v_debtor_ids, 1), 0);
  IF v_debtor_count = 0 THEN RETURN v_expense_id; END IF;
  FOR v_idx IN 1..v_debtor_count LOOP
    v_extra := CASE WHEN v_idx <= v_remainder THEN 1 ELSE 0 END;
    INSERT INTO public.debt_ledger (house_id, debtor_id, creditor_id, amount_cents, expense_id)
    VALUES (v_house_id, v_debtor_ids[v_idx], v_user_id, v_base_share + v_extra, v_expense_id);
  END LOOP;
  RETURN v_expense_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_expense_with_equal_split(text, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.create_expense_with_equal_split(text, integer) TO authenticated;

-- Debt settlement
ALTER TABLE public.debt_ledger
  ADD COLUMN IF NOT EXISTS settled_at timestamptz;

CREATE INDEX IF NOT EXISTS debt_ledger_unsettled_house_idx
  ON public.debt_ledger (house_id)
  WHERE settled_at IS NULL;

CREATE OR REPLACE FUNCTION public.settle_expense_debts(p_expense_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_house_id := public.user_house_id();
  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Join a house first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.expenses e
    WHERE e.id = p_expense_id AND e.house_id = v_house_id
  ) THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;
  UPDATE public.debt_ledger
  SET settled_at = now()
  WHERE expense_id = p_expense_id
    AND house_id = v_house_id
    AND settled_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.settle_all_house_debts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_house_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  v_house_id := public.user_house_id();
  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Join a house first';
  END IF;
  UPDATE public.debt_ledger
  SET settled_at = now()
  WHERE house_id = v_house_id
    AND settled_at IS NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_expense_debts(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.settle_expense_debts(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.settle_all_house_debts() FROM public;
GRANT EXECUTE ON FUNCTION public.settle_all_house_debts() TO authenticated;

-- Backfill: first member in each house without an admin becomes admin
UPDATE public.profiles p SET house_role = 'admin'
FROM public.houses h
WHERE p.house_id = h.id AND p.house_role = 'member'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles o
    WHERE o.house_id = h.id AND o.house_role = 'admin'
  );

-- -----------------------------------------------------------------------------
-- PART 5: Rewards shop
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  house_id uuid NOT NULL REFERENCES public.houses (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  reward_key text NOT NULL CHECK (char_length(trim(reward_key)) >= 1),
  xp_spent integer NOT NULL CHECK (xp_spent > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reward_redemptions_house_created_idx
  ON public.reward_redemptions (house_id, created_at DESC);

ALTER TABLE public.reward_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reward_redemptions_select_housemates" ON public.reward_redemptions;
CREATE POLICY "reward_redemptions_select_housemates"
  ON public.reward_redemptions FOR SELECT
  TO authenticated
  USING (house_id = public.user_house_id());

CREATE OR REPLACE FUNCTION public.redeem_reward(p_reward_key text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp_cost integer;
  v_total_xp integer;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_house_id := public.user_house_id();
  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'Join a house first';
  END IF;

  v_xp_cost := CASE trim(p_reward_key)
    WHEN 'pick_friday_movie' THEN 100
    WHEN 'skip_dish_duty' THEN 250
    WHEN 'dj_cleanup' THEN 75
    WHEN 'comfy_couch_weekend' THEN 150
    WHEN 'veto_chore_assignment' THEN 200
    WHEN 'delivery_pick' THEN 180
    WHEN 'trash_immunity_week' THEN 400
    ELSE NULL
  END;

  IF v_xp_cost IS NULL THEN
    RAISE EXCEPTION 'Invalid reward';
  END IF;

  SELECT total_xp INTO v_total_xp
  FROM public.profiles
  WHERE id = v_user_id
  FOR UPDATE;

  IF v_total_xp IS NULL THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  IF v_total_xp < v_xp_cost THEN
    RAISE EXCEPTION 'Insufficient XP';
  END IF;

  UPDATE public.profiles
  SET total_xp = total_xp - v_xp_cost
  WHERE id = v_user_id;

  INSERT INTO public.reward_redemptions (house_id, profile_id, reward_key, xp_spent)
  VALUES (v_house_id, v_user_id, trim(p_reward_key), v_xp_cost);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_reward(text) FROM public;
GRANT EXECUTE ON FUNCTION public.redeem_reward(text) TO authenticated;

-- Done
SELECT 'HouseMate Harmony migrations applied successfully' AS status;
