-- Fix: insert on "houses" violates foreign key "houses_created_by_fkey"
-- Cause: created_by references profiles(id), but auth user has no profiles row yet.
-- Run once in Supabase SQL Editor.

-- 1) Backfill profiles for any existing auth users missing a profile row
INSERT INTO public.profiles (id, username)
SELECT
  u.id,
  left(
    coalesce(
      nullif(trim(u.raw_user_meta_data ->> 'username'), ''),
      split_part(u.email, '@', 1),
      'user' || left(replace(u.id::text, '-', ''), 6)
    ),
    24
  )
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- 2) Helper: ensure caller has a profile before house operations
CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_username text;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    RETURN;
  END IF;

  SELECT left(
    coalesce(
      nullif(trim(raw_user_meta_data ->> 'username'), ''),
      split_part(email, '@', 1),
      'user' || left(replace(id::text, '-', ''), 6)
    ),
    24
  )
  INTO v_username
  FROM auth.users
  WHERE id = v_user_id;

  IF v_username IS NULL OR char_length(v_username) < 2 THEN
    v_username := 'user' || left(replace(v_user_id::text, '-', ''), 6);
  END IF;

  INSERT INTO public.profiles (id, username)
  VALUES (v_user_id, v_username);
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated;

-- 3) create_house: ensure profile exists before insert
CREATE OR REPLACE FUNCTION public.create_house(p_name text)
RETURNS TABLE (house_id uuid, invite_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_invite_code text;
  v_name text := trim(p_name);
  attempts integer := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.ensure_user_profile();

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND public.profiles.house_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Already in a house';
  END IF;

  IF v_name IS NULL OR char_length(v_name) < 1 THEN
    RAISE EXCEPTION 'House name is required';
  END IF;

  LOOP
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    BEGIN
      INSERT INTO public.houses (name, invite_code, created_by)
      VALUES (v_name, v_invite_code, v_user_id)
      RETURNING id INTO v_house_id;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF attempts >= 10 THEN
        RAISE EXCEPTION 'Could not generate invite code';
      END IF;
    END;
  END LOOP;

  UPDATE public.profiles
  SET house_id = v_house_id, house_role = 'admin'
  WHERE id = v_user_id;

  RETURN QUERY SELECT v_house_id, v_invite_code;
END;
$$;

-- 4) join_house: same profile guard
CREATE OR REPLACE FUNCTION public.join_house(p_invite_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_code text := upper(trim(p_invite_code));
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  PERFORM public.ensure_user_profile();

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = v_user_id AND house_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Already in a house';
  END IF;

  IF v_code IS NULL OR char_length(v_code) < 4 THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT id INTO v_house_id
  FROM public.houses
  WHERE invite_code = v_code;

  IF v_house_id IS NULL THEN
    RAISE EXCEPTION 'House not found';
  END IF;

  UPDATE public.profiles
  SET house_id = v_house_id, house_role = 'member'
  WHERE id = v_user_id;

  RETURN v_house_id;
END;
$$;

SELECT 'create_house / join_house fixed — profile backfill applied' AS status;
