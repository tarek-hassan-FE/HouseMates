-- Recurring chores: calendar-aligned reactivation + optional round-robin assignment

alter table public.chores
  add column if not exists rotate_assignment boolean not null default false,
  add column if not exists reactivates_at timestamptz;

-- Calendar-aligned next active time (UTC). Returns null for one-time chores.
create or replace function public.chore_reactivates_at(
  p_frequency public.chore_frequency,
  p_completed_at timestamptz
)
returns timestamptz
language plpgsql
immutable
set search_path = public
as $$
declare
  v_day date;
begin
  if p_frequency = 'once' then
    return null;
  end if;

  v_day := (p_completed_at at time zone 'UTC')::date;

  case p_frequency
    when 'daily' then
      return ((v_day + 1)::timestamp at time zone 'UTC');
    when 'weekly' then
      return ((v_day + 7)::timestamp at time zone 'UTC');
    when 'biweekly' then
      return ((v_day + 14)::timestamp at time zone 'UTC');
    when 'monthly' then
      return ((v_day + interval '1 month')::timestamp at time zone 'UTC');
    else
      return null;
  end case;
end;
$$;

-- Next house member after last completer (username order, wrap).
create or replace function public.next_rotated_assignee(
  p_house_id uuid,
  p_last_completer uuid
)
returns uuid
language sql
stable
set search_path = public
as $$
  with ordered as (
    select
      id,
      row_number() over (order by username asc, id asc) as pos
    from public.profiles
    where house_id = p_house_id
  ),
  completer_pos as (
    select coalesce(
      (select pos from ordered where id = p_last_completer),
      0
    ) as pos
  ),
  next_pos as (
    select case
      when (select count(*) from ordered) = 0 then null::bigint
      when completer_pos.pos = 0 then 1
      when completer_pos.pos >= (select max(pos) from ordered) then 1
      else completer_pos.pos + 1
    end as pos
    from completer_pos
  )
  select o.id
  from ordered o
  inner join next_pos np on o.pos = np.pos
  limit 1;
$$;

-- Reactivate chores whose cooldown has elapsed.
create or replace function public.reactivate_due_chores(p_house_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chore record;
  v_next_assignee uuid;
begin
  if p_house_id is null then
    return;
  end if;

  if auth.uid() is not null and p_house_id <> public.user_house_id() then
    raise exception 'House not accessible';
  end if;

  for v_chore in
    select id, house_id, rotate_assignment, last_completed_by, assigned_to
    from public.chores
    where house_id = p_house_id
      and frequency <> 'once'
      and reactivates_at is not null
      and reactivates_at <= now()
      and last_completed_at is not null
  loop
    v_next_assignee := v_chore.assigned_to;

    if v_chore.rotate_assignment then
      v_next_assignee := public.next_rotated_assignee(
        v_chore.house_id,
        coalesce(v_chore.last_completed_by, v_chore.assigned_to)
      );
    end if;

    update public.chores
    set
      last_completed_at = null,
      last_completed_by = null,
      last_proof_image_url = null,
      reactivates_at = null,
      assigned_to = case
        when v_chore.rotate_assignment then v_next_assignee
        else assigned_to
      end
    where id = v_chore.id;
  end loop;
end;
$$;

-- claim_chore
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

  perform public.reactivate_due_chores(v_house_id);

  select assigned_to, last_completed_at
  into v_assigned_to, v_completed_at
  from public.chores
  where id = p_chore_id;

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

-- submit_chore_completion
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

  perform public.reactivate_due_chores(v_house_id);

  select assigned_to, last_completed_at
  into v_assigned_to, v_completed_at
  from public.chores
  where id = p_chore_id;

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

-- approve_chore_completion
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
  v_frequency public.chore_frequency;
  v_completed_at timestamptz := now();
  v_reactivates_at timestamptz;
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

  perform public.reactivate_due_chores(v_house_id);

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

  select frequency into v_frequency
  from public.chores
  where id = v_chore_id;

  v_reactivates_at := public.chore_reactivates_at(v_frequency, v_completed_at);

  select total_xp + v_xp into v_new_xp
  from public.profiles
  where id = v_submitted_by;

  update public.chore_completions
  set
    status = 'approved',
    reviewed_at = v_completed_at,
    reviewed_by = v_user_id
  where id = p_completion_id;

  update public.chores
  set
    last_completed_at = v_completed_at,
    last_completed_by = v_submitted_by,
    reactivates_at = v_reactivates_at
  where id = v_chore_id;

  update public.profiles
  set
    total_xp = v_new_xp,
    current_level = greatest(current_level, public.level_from_xp(v_new_xp))
  where id = v_submitted_by;
end;
$$;

-- complete_chore
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
  v_frequency public.chore_frequency;
  v_now timestamptz := now();
  v_reactivates_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only admins can instantly complete chores';
  end if;

  select house_id, xp_reward, assigned_to, last_completed_at, frequency
  into v_house_id, v_xp, v_assigned_to, v_completed_at, v_frequency
  from public.chores
  where id = p_chore_id;

  if v_house_id is null then
    raise exception 'Chore not found';
  end if;

  perform public.reactivate_due_chores(v_house_id);

  select last_completed_at into v_completed_at
  from public.chores
  where id = p_chore_id;

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
  v_reactivates_at := public.chore_reactivates_at(v_frequency, v_now);

  select total_xp + v_xp into v_new_xp
  from public.profiles
  where id = v_recipient;

  update public.chores
  set
    last_completed_at = v_now,
    last_completed_by = v_recipient,
    reactivates_at = v_reactivates_at
  where id = p_chore_id;

  update public.profiles
  set
    total_xp = v_new_xp,
    current_level = greatest(current_level, public.level_from_xp(v_new_xp))
  where id = v_recipient;
end;
$$;

-- reopen_chore (level sync + proof + reactivates_at)
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
    last_completed_by = null,
    last_proof_image_url = null,
    reactivates_at = null
  where id = p_chore_id;
end;
$$;

revoke all on function public.chore_reactivates_at(public.chore_frequency, timestamptz) from public;
revoke all on function public.next_rotated_assignee(uuid, uuid) from public;
revoke all on function public.reactivate_due_chores(uuid) from public;

grant execute on function public.chore_reactivates_at(public.chore_frequency, timestamptz) to authenticated;
grant execute on function public.reactivate_due_chores(uuid) to authenticated;
