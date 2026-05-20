-- Chore claim, submit-for-approval, and admin approve/reject flow

-- last_completed_by on chores
alter table public.chores
  add column if not exists last_completed_by uuid references public.profiles (id) on delete set null;

-- completion request status
do $$ begin
  create type public.chore_completion_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores (id) on delete cascade,
  house_id uuid not null references public.houses (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  xp_reward integer not null check (xp_reward >= 0),
  status public.chore_completion_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles (id) on delete set null
);

create unique index if not exists chore_completions_one_pending_per_chore
  on public.chore_completions (chore_id)
  where (status = 'pending');

create index if not exists chore_completions_house_status_idx
  on public.chore_completions (house_id, status);

alter table public.chore_completions enable row level security;

create policy "chore_completions_select_house"
  on public.chore_completions for select
  to authenticated
  using (house_id = public.user_house_id());

-- claim_chore: member self-assigns unassigned active chore
create or replace function public.claim_chore(p_chore_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_assigned_to uuid;
  v_completed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_house_admin() then
    raise exception 'Admins cannot claim chores';
  end if;

  select house_id, assigned_to, last_completed_at
  into v_house_id, v_assigned_to, v_completed_at
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

  if v_assigned_to is not null then
    raise exception 'Chore is already assigned';
  end if;

  if exists (
    select 1 from public.chore_completions
    where chore_id = p_chore_id and status = 'pending'
  ) then
    raise exception 'Chore has a pending completion';
  end if;

  update public.chores
  set assigned_to = v_user_id
  where id = p_chore_id;
end;
$$;

-- submit_chore_completion: member marks done, awaits admin approval
create or replace function public.submit_chore_completion(p_chore_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_assigned_to uuid;
  v_xp integer;
  v_completed_at timestamptz;
  v_completion_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if public.is_house_admin() then
    raise exception 'Admins must use complete_chore';
  end if;

  select house_id, assigned_to, xp_reward, last_completed_at
  into v_house_id, v_assigned_to, v_xp, v_completed_at
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

  if v_assigned_to is distinct from v_user_id then
    raise exception 'You can only submit chores assigned to you';
  end if;

  if exists (
    select 1 from public.chore_completions
    where chore_id = p_chore_id and status = 'pending'
  ) then
    raise exception 'Completion already pending';
  end if;

  insert into public.chore_completions (
    chore_id, house_id, submitted_by, xp_reward, status
  )
  values (p_chore_id, v_house_id, v_user_id, v_xp, 'pending')
  returning id into v_completion_id;

  return v_completion_id;
end;
$$;

-- approve_chore_completion: admin approves pending submission
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
  set total_xp = total_xp + v_xp
  where id = v_submitted_by;
end;
$$;

-- reject_chore_completion: admin rejects pending submission
create or replace function public.reject_chore_completion(p_completion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_status public.chore_completion_status;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only house admins can reject completions';
  end if;

  select house_id, status
  into v_house_id, v_status
  from public.chore_completions
  where id = p_completion_id;

  if v_house_id is null then
    raise exception 'Completion not found';
  end if;

  if v_house_id <> public.user_house_id() then
    raise exception 'Completion not in your house';
  end if;

  if v_status <> 'pending' then
    raise exception 'Completion is not pending';
  end if;

  update public.chore_completions
  set
    status = 'rejected',
    reviewed_at = now(),
    reviewed_by = v_user_id
  where id = p_completion_id;
end;
$$;

-- complete_chore: admin instant complete (members use submit)
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

  update public.chores
  set
    last_completed_at = now(),
    last_completed_by = v_recipient
  where id = p_chore_id;

  update public.profiles
  set total_xp = total_xp + v_xp
  where id = v_recipient;
end;
$$;

-- reopen_chore: admin reopens completed chore, optionally claw back XP
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
    update public.profiles
    set total_xp = greatest(0, total_xp - v_xp)
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

revoke all on function public.claim_chore(uuid) from public;
revoke all on function public.submit_chore_completion(uuid) from public;
revoke all on function public.approve_chore_completion(uuid) from public;
revoke all on function public.reject_chore_completion(uuid) from public;
revoke all on function public.complete_chore(uuid) from public;
revoke all on function public.reopen_chore(uuid) from public;

grant execute on function public.claim_chore(uuid) to authenticated;
grant execute on function public.submit_chore_completion(uuid) to authenticated;
grant execute on function public.approve_chore_completion(uuid) to authenticated;
grant execute on function public.reject_chore_completion(uuid) to authenticated;
grant execute on function public.complete_chore(uuid) to authenticated;
grant execute on function public.reopen_chore(uuid) to authenticated;
