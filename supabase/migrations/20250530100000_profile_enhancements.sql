-- Profile preferences + sync current_level from total_xp (100 XP per level).
--
-- Expected Supabase SQL Editor notices (safe to proceed if prior migrations ran):
--   • ADD COLUMN on profiles (brief lock)
--   • UPDATE backfills current_level for matching rows
--   • CREATE OR REPLACE on SECURITY DEFINER functions (approve/complete/reopen chore)
--
-- Run via `npm run db:push` on a linked project, not as your first migration on an empty DB.

-- ---------------------------------------------------------------------------
-- 1. Profile preference columns
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists push_notifications_enabled boolean not null default true,
  add column if not exists leaderboard_visible boolean not null default true;

-- ---------------------------------------------------------------------------
-- 2. Level helper
-- ---------------------------------------------------------------------------
create or replace function public.level_from_xp(p_total_xp integer)
returns integer
language sql
immutable
parallel safe
set search_path = public
as $$
  select greatest(1, coalesce(p_total_xp, 0) / 100 + 1);
$$;

-- Backfill level from XP (does not lower levels that were set higher manually)
update public.profiles
set current_level = greatest(current_level, public.level_from_xp(total_xp))
where current_level < public.level_from_xp(total_xp);

-- ---------------------------------------------------------------------------
-- 3. XP RPCs — keep level in sync when XP changes
-- ---------------------------------------------------------------------------

create or replace function public.approve_chore_completion(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_chore_id uuid;
  v_house_id uuid;
  v_submitted_by uuid;
  v_xp integer;
  v_status public.chore_completion_status;
  v_new_xp integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only house admins can approve completions';
  end if;

  select chore_id, house_id, submitted_by, xp_reward, status
  into v_chore_id, v_house_id, v_submitted_by, v_xp, v_status
  from public.chore_completions
  where id = p_completion_id;

  if v_chore_id is null then
    raise exception 'Completion not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Completion not in your house';
  end if;

  if v_status <> 'pending' then
    raise exception 'Completion is not pending';
  end if;

  if exists (
    select 1 from public.chores
    where id = v_chore_id and last_completed_at is not null
  ) then
    raise exception 'Chore is already completed';
  end if;

  select total_xp + v_xp into v_new_xp
  from public.profiles
  where id = v_submitted_by;

  update public.chore_completions
  set
    status = 'approved',
    reviewed_at = now(),
    reviewed_by = v_user_id
  where id = p_completion_id;

  update public.chores
  set
    last_completed_at = now(),
    last_completed_by = v_submitted_by
  where id = v_chore_id;

  update public.profiles
  set
    total_xp = v_new_xp,
    current_level = greatest(current_level, public.level_from_xp(v_new_xp))
  where id = v_submitted_by;
end;
$$;

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
  v_completed_at timestamptz;
  v_recipient uuid;
  v_new_xp integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only admins can instantly complete chores';
  end if;

  select house_id, xp_reward, assigned_to, last_completed_at
  into v_house_id, v_xp, v_assigned_to, v_completed_at
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Chore not in your house';
  end if;

  if v_completed_at is not null then
    raise exception 'Chore is already completed';
  end if;

  if exists (
    select 1 from public.chore_completions
    where chore_id = p_chore_id and status = 'pending'
  ) then
    raise exception 'Approve or reject the pending completion first';
  end if;

  v_recipient := coalesce(v_assigned_to, v_user_id);

  select total_xp + v_xp into v_new_xp
  from public.profiles
  where id = v_recipient;

  update public.chores
  set
    last_completed_at = now(),
    last_completed_by = v_recipient
  where id = p_chore_id;

  update public.profiles
  set
    total_xp = v_new_xp,
    current_level = greatest(current_level, public.level_from_xp(v_new_xp))
  where id = v_recipient;
end;
$$;

create or replace function public.reopen_chore(p_chore_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_xp integer;
  v_completed_by uuid;
  v_completed_at timestamptz;
  v_new_xp integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only house admins can reopen chores';
  end if;

  select house_id, xp_reward, last_completed_by, last_completed_at
  into v_house_id, v_xp, v_completed_by, v_completed_at
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Chore not in your house';
  end if;

  if v_completed_at is null then
    raise exception 'Chore is not completed';
  end if;

  if v_completed_by is not null then
    v_new_xp := greatest(0, (
      select total_xp from public.profiles where id = v_completed_by
    ) - v_xp);

    update public.profiles
    set
      total_xp = v_new_xp,
      current_level = public.level_from_xp(v_new_xp)
    where id = v_completed_by;
  end if;

  delete from public.chore_completions
  where chore_id = p_chore_id and status = 'pending';

  update public.chores
  set
    last_completed_at = null,
    last_completed_by = null
  where id = p_chore_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Re-assert execute grants (CREATE OR REPLACE keeps them; explicit for linter)
-- ---------------------------------------------------------------------------
revoke all on function public.level_from_xp(integer) from public;

revoke all on function public.approve_chore_completion(uuid) from public;
revoke all on function public.complete_chore(uuid) from public;
revoke all on function public.reopen_chore(uuid) from public;

grant execute on function public.approve_chore_completion(uuid) to authenticated;
grant execute on function public.complete_chore(uuid) to authenticated;
grant execute on function public.reopen_chore(uuid) to authenticated;
