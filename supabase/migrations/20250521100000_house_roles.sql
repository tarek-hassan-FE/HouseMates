-- Phase 2: house roles, admin RPCs, RLS split
-- Requires Phase 1 tables (20250520190000_schema.sql).
-- Includes user_house_id() so this file can run without 20250520190001_rls.sql.

DO $$ BEGIN
  CREATE TYPE public.house_role AS ENUM ('admin', 'member');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

alter table public.houses
  add column if not exists created_by uuid references public.profiles (id) on delete set null;

alter table public.profiles
  add column if not exists house_role public.house_role not null default 'member';

-- Helpers (from Phase 1 RLS — recreated here for hosted Supabase one-shot runs)
create or replace function public.user_house_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select house_id from public.profiles where id = auth.uid();
$$;

revoke all on function public.user_house_id() from public;
grant execute on function public.user_house_id() to authenticated;

create or replace function public.is_house_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select house_role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

revoke all on function public.is_house_admin() from public;
grant execute on function public.is_house_admin() to authenticated;

-- Drop old permissive chore/expense policies
drop policy if exists "chores_insert" on public.chores;
drop policy if exists "chores_update" on public.chores;
drop policy if exists "chores_delete" on public.chores;
drop policy if exists "expenses_update" on public.expenses;
drop policy if exists "expenses_delete" on public.expenses;
drop policy if exists "houses_select_own" on public.houses;
drop policy if exists "houses_update_admin" on public.houses;
drop policy if exists "chores_insert_admin" on public.chores;
drop policy if exists "chores_update_admin" on public.chores;
drop policy if exists "chores_update_member_complete" on public.chores;
drop policy if exists "chores_delete_admin" on public.chores;
drop policy if exists "expenses_delete_admin" on public.expenses;

-- HOUSES: select for house members; update for admins only
create policy "houses_select_own"
  on public.houses for select
  to authenticated
  using (id = public.user_house_id());

create policy "houses_update_admin"
  on public.houses for update
  to authenticated
  using (id = public.user_house_id() and public.is_house_admin())
  with check (id = public.user_house_id() and public.is_house_admin());

-- CHORES: admin CRUD; members complete assigned chores only
create policy "chores_insert_admin"
  on public.chores for insert
  to authenticated
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "chores_update_admin"
  on public.chores for update
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin())
  with check (house_id = public.user_house_id() and public.is_house_admin());

create policy "chores_update_member_complete"
  on public.chores for update
  to authenticated
  using (
    house_id = public.user_house_id()
    and assigned_to = auth.uid()
    and not public.is_house_admin()
  )
  with check (
    house_id = public.user_house_id()
    and assigned_to = auth.uid()
  );

create policy "chores_delete_admin"
  on public.chores for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());

-- EXPENSES: members insert; admin delete
create policy "expenses_delete_admin"
  on public.expenses for delete
  to authenticated
  using (house_id = public.user_house_id() and public.is_house_admin());

-- Complete chore + award XP (security definer)
create or replace function public.complete_chore(p_chore_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp integer;
  v_assigned_to uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select house_id, xp_reward, assigned_to
  into v_house_id, v_xp, v_assigned_to
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Chore not in your house';
  end if;

  if not public.is_house_admin() and v_assigned_to <> v_user_id then
    raise exception 'You can only complete chores assigned to you';
  end if;

  update public.chores
  set last_completed_at = now()
  where id = p_chore_id;

  update public.profiles
  set total_xp = total_xp + v_xp
  where id = coalesce(v_assigned_to, v_user_id);
end;
$$;

revoke all on function public.complete_chore(uuid) from public;
grant execute on function public.complete_chore(uuid) to authenticated;

-- Updated onboarding RPCs with roles (see 20250521100002_ensure_user_profile.sql for profile guard)
create or replace function public.create_house(p_name text)
returns table (house_id uuid, invite_code text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_invite_code text;
  v_name text := trim(p_name);
  attempts integer := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1 from public.profiles
    where id = v_user_id and public.profiles.house_id is not null
  ) then
    raise exception 'Already in a house';
  end if;

  if v_name is null or char_length(v_name) < 1 then
    raise exception 'House name is required';
  end if;

  loop
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    begin
      insert into public.houses (name, invite_code, created_by)
      values (v_name, v_invite_code, v_user_id)
      returning id into v_house_id;
      exit;
    exception when unique_violation then
      if attempts >= 10 then
        raise exception 'Could not generate invite code';
      end if;
    end;
  end loop;

  update public.profiles
  set house_id = v_house_id, house_role = 'admin'
  where id = v_user_id;

  return query select v_house_id, v_invite_code;
end;
$$;

create or replace function public.join_house(p_invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_code text := upper(trim(p_invite_code));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from public.profiles where id = v_user_id and house_id is not null) then
    raise exception 'Already in a house';
  end if;

  if v_code is null or char_length(v_code) < 4 then
    raise exception 'Invalid invite code';
  end if;

  select id into v_house_id
  from public.houses
  where invite_code = v_code;

  if v_house_id is null then
    raise exception 'House not found';
  end if;

  update public.profiles
  set house_id = v_house_id, house_role = 'member'
  where id = v_user_id;

  return v_house_id;
end;
$$;

-- Admin RPCs
create or replace function public.update_house_name(p_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(p_name);
begin
  if not public.is_house_admin() then
    raise exception 'Only house admins can rename the house';
  end if;

  if v_name is null or char_length(v_name) < 1 then
    raise exception 'House name is required';
  end if;

  update public.houses
  set name = v_name
  where id = public.user_house_id();
end;
$$;

create or replace function public.regenerate_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid := public.user_house_id();
  v_invite_code text;
  attempts integer := 0;
begin
  if not public.is_house_admin() then
    raise exception 'Only house admins can regenerate invite codes';
  end if;

  loop
    attempts := attempts + 1;
    v_invite_code := public.generate_invite_code();
    begin
      update public.houses
      set invite_code = v_invite_code
      where id = v_house_id;
      return v_invite_code;
    exception when unique_violation then
      if attempts >= 10 then
        raise exception 'Could not generate invite code';
      end if;
    end;
  end loop;
end;
$$;

create or replace function public.remove_house_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid := public.user_house_id();
  v_admin_count integer;
begin
  if not public.is_house_admin() then
    raise exception 'Only house admins can remove members';
  end if;

  if p_user_id = auth.uid() then
    select count(*) into v_admin_count
    from public.profiles
    where house_id = v_house_id and house_role = 'admin';

    if v_admin_count <= 1 then
      raise exception 'Transfer admin role before leaving as the only admin';
    end if;
  end if;

  update public.profiles
  set house_id = null, house_role = 'member'
  where id = p_user_id and house_id = v_house_id;

  if not found then
    raise exception 'Member not found in your house';
  end if;
end;
$$;

create or replace function public.transfer_house_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_house_id uuid := public.user_house_id();
begin
  if not public.is_house_admin() then
    raise exception 'Only house admins can transfer admin role';
  end if;

  if p_user_id = auth.uid() then
    raise exception 'Cannot transfer admin to yourself';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = p_user_id and house_id = v_house_id
  ) then
    raise exception 'Member not found in your house';
  end if;

  update public.profiles
  set house_role = 'member'
  where id = auth.uid();

  update public.profiles
  set house_role = 'admin'
  where id = p_user_id;
end;
$$;

revoke all on function public.update_house_name(text) from public;
revoke all on function public.regenerate_invite_code() from public;
revoke all on function public.remove_house_member(uuid) from public;
revoke all on function public.transfer_house_admin(uuid) from public;
grant execute on function public.update_house_name(text) to authenticated;
grant execute on function public.regenerate_invite_code() to authenticated;
grant execute on function public.remove_house_member(uuid) to authenticated;
grant execute on function public.transfer_house_admin(uuid) to authenticated;

-- Backfill: house creators are admins
update public.profiles p
set house_role = 'admin'
from public.houses h
where p.house_id = h.id
  and (h.created_by = p.id or h.created_by is null)
  and p.house_role = 'member'
  and not exists (
    select 1 from public.profiles o
    where o.house_id = h.id and o.house_role = 'admin' and o.id <> p.id
  );
