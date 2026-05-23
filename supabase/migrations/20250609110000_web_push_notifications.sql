-- Web Push: push subscriptions/outbox, event hooks, chore reminders

-- Push subscription storage
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (user_id = auth.uid());

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (user_id = auth.uid());

-- Async push dispatch queue
create table if not exists public.push_outbox (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  created_at timestamptz not null default now(),
  delivered_at timestamptz,
  last_error text
);

create unique index if not exists push_outbox_notification_id_idx
  on public.push_outbox (notification_id);

create index if not exists push_outbox_pending_idx
  on public.push_outbox (created_at)
  where delivered_at is null;

alter table public.push_outbox enable row level security;

-- Outbox read/update via service role only (no authenticated policies)

create or replace function public.enqueue_push_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.push_outbox (notification_id)
  values (new.id)
  on conflict (notification_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_enqueue_push_notification on public.notifications;
create trigger trg_enqueue_push_notification
  after insert on public.notifications
  for each row
  execute function public.enqueue_push_notification();

-- Central notification insert
create or replace function public.create_notification(
  p_recipient_id uuid,
  p_actor_id uuid,
  p_house_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if p_recipient_id is null or p_actor_id is null or p_house_id is null then
    return null;
  end if;

  if p_recipient_id = p_actor_id and p_type <> 'chore_reminder' then
    return null;
  end if;

  insert into public.notifications (
    house_id,
    recipient_id,
    actor_id,
    type,
    title,
    body,
    payload
  )
  values (
    p_house_id,
    p_recipient_id,
    p_actor_id,
    p_type,
    p_title,
    p_body,
    coalesce(p_payload, '{}'::jsonb)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.notify_housemates_except(
  p_house_id uuid,
  p_exclude_user_id uuid,
  p_actor_id uuid,
  p_type public.notification_type,
  p_title text,
  p_body text,
  p_payload jsonb default '{}'::jsonb
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member record;
  v_count integer := 0;
begin
  for v_member in
    select id from public.profiles
    where house_id = p_house_id
      and id <> p_exclude_user_id
  loop
    if public.create_notification(
      v_member.id,
      p_actor_id,
      p_house_id,
      p_type,
      p_title,
      p_body,
      p_payload
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

create or replace function public.notify_chore_assigned(
  p_chore_id uuid,
  p_assignee uuid,
  p_actor uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chore public.chores%rowtype;
  v_actor_name text;
begin
  if p_assignee is null then
    return;
  end if;

  select * into v_chore from public.chores where id = p_chore_id;
  if not found then
    return;
  end if;

  select username into v_actor_name
  from public.profiles
  where id = p_actor;

  perform public.create_notification(
    p_assignee,
    coalesce(p_actor, p_assignee),
    v_chore.house_id,
    'chore_assigned',
    'Chore assigned',
    coalesce(v_actor_name, 'Someone')
      || ' assigned you "'
      || v_chore.title
      || '"',
    jsonb_build_object('path', '/chores', 'chore_id', p_chore_id)
  );
end;
$$;

create or replace function public.trg_chores_notify_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigned_to is not null
     and (tg_op = 'INSERT' or old.assigned_to is distinct from new.assigned_to) then
    perform public.notify_chore_assigned(
      new.id,
      new.assigned_to,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_chore_assigned on public.chores;
create trigger trg_notify_chore_assigned
  after insert or update of assigned_to on public.chores
  for each row
  execute function public.trg_chores_notify_assigned();

create or replace function public.should_send_chore_reminder(
  p_chore_id uuid,
  p_assignee uuid,
  p_house_id uuid,
  p_frequency public.chore_frequency,
  p_created_at timestamptz,
  p_reactivates_at timestamptz,
  p_last_completed_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  v_anchor timestamptz;
  v_anchor_dow integer;
  v_now_dow integer;
  v_weeks_since integer;
begin
  if p_assignee is null or p_frequency = 'once' then
    return false;
  end if;

  if p_last_completed_at is not null
     and (p_reactivates_at is null or p_reactivates_at > p_now) then
    return false;
  end if;

  v_anchor := coalesce(p_reactivates_at, p_created_at);
  v_anchor_dow := extract(isodow from v_anchor at time zone 'UTC')::integer;
  v_now_dow := extract(isodow from p_now at time zone 'UTC')::integer;

  case p_frequency
    when 'daily' then
      null;
    when 'weekly' then
      if v_now_dow <> v_anchor_dow then
        return false;
      end if;
    when 'biweekly' then
      if v_now_dow <> v_anchor_dow then
        return false;
      end if;
      v_weeks_since := floor(
        extract(epoch from (p_now - v_anchor)) / (7 * 24 * 60 * 60)
      )::integer;
      if v_weeks_since % 2 <> 0 then
        return false;
      end if;
    when 'monthly' then
      if extract(day from p_now at time zone 'UTC')::integer <>
         extract(day from v_anchor at time zone 'UTC')::integer then
        return false;
      end if;
    else
      return false;
  end case;

  if exists (
    select 1
    from public.notifications n
    where n.recipient_id = p_assignee
      and n.type = 'chore_reminder'
      and n.payload->>'chore_id' = p_chore_id::text
      and case p_frequency
        when 'daily' then
          (n.created_at at time zone 'UTC')::date = (p_now at time zone 'UTC')::date
        when 'weekly' then
          date_trunc('week', n.created_at at time zone 'UTC')
            = date_trunc('week', p_now at time zone 'UTC')
        when 'biweekly' then
          date_trunc('week', n.created_at at time zone 'UTC')
            = date_trunc('week', p_now at time zone 'UTC')
        when 'monthly' then
          date_trunc('month', n.created_at at time zone 'UTC')
            = date_trunc('month', p_now at time zone 'UTC')
        else false
      end
  ) then
    return false;
  end if;

  return true;
end;
$$;

create or replace function public.send_chore_reminders()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_chore record;
  v_count integer := 0;
  v_now timestamptz := now();
begin
  for v_chore in
    select
      c.id,
      c.house_id,
      c.title,
      c.assigned_to,
      c.frequency,
      c.created_at,
      c.reactivates_at,
      c.last_completed_at
    from public.chores c
    where c.assigned_to is not null
      and c.frequency <> 'once'
  loop
    if not public.should_send_chore_reminder(
      v_chore.id,
      v_chore.assigned_to,
      v_chore.house_id,
      v_chore.frequency,
      v_chore.created_at,
      v_chore.reactivates_at,
      v_chore.last_completed_at,
      v_now
    ) then
      continue;
    end if;

    if public.create_notification(
      v_chore.assigned_to,
      v_chore.assigned_to,
      v_chore.house_id,
      'chore_reminder',
      'Chore reminder',
      'Reminder: "'
        || v_chore.title
        || '" is waiting for you',
      jsonb_build_object('path', '/chores', 'chore_id', v_chore.id)
    ) is not null then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- Refactor payment reminders to use create_notification
create or replace function public.send_payment_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_actor_name text;
  v_debtor record;
  v_notified_count integer := 0;
  v_skipped jsonb := '[]'::jsonb;
  v_last_remind timestamptz;
  v_next_remind timestamptz;
  v_amount_display text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  select username into v_actor_name
  from public.profiles
  where id = v_user_id;

  for v_debtor in
    select
      dl.debtor_id,
      sum(dl.amount_cents)::bigint as amount_cents
    from public.debt_ledger dl
    where dl.house_id = v_house_id
      and dl.creditor_id = v_user_id
      and dl.debtor_id <> v_user_id
      and dl.settled_at is null
    group by dl.debtor_id
    having sum(dl.amount_cents) > 0
  loop
    select max(n.created_at) into v_last_remind
    from public.notifications n
    where n.actor_id = v_user_id
      and n.recipient_id = v_debtor.debtor_id
      and n.type = 'payment_reminder'
      and n.created_at > now() - interval '24 hours';

    if v_last_remind is not null then
      v_next_remind := v_last_remind + interval '24 hours';
      v_skipped := v_skipped || jsonb_build_array(
        jsonb_build_object(
          'debtor_id', v_debtor.debtor_id,
          'next_remind_at', v_next_remind
        )
      );
      continue;
    end if;

    v_amount_display := trim(
      to_char(v_debtor.amount_cents / 100.0, 'FM999999990.00')
    );

    if public.create_notification(
      v_debtor.debtor_id,
      v_user_id,
      v_house_id,
      'payment_reminder',
      'Payment reminder',
      coalesce(v_actor_name, 'A roommate')
        || ' reminded you to settle '
        || v_amount_display,
      jsonb_build_object('amount_cents', v_debtor.amount_cents, 'path', '/ledger')
    ) is not null then
      v_notified_count := v_notified_count + 1;
    end if;
  end loop;

  if v_notified_count = 0 and jsonb_array_length(v_skipped) = 0 then
    raise exception 'No outstanding balances owed to you';
  end if;

  if v_notified_count = 0 then
    raise exception 'All reminders on cooldown';
  end if;

  return jsonb_build_object(
    'notified_count', v_notified_count,
    'skipped', v_skipped
  );
end;
$$;

-- approve_chore_completion + chore completed notifications
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
  v_chore_title text;
  v_completer_name text;
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

  select frequency, title
  into v_frequency, v_chore_title
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

  select username into v_completer_name
  from public.profiles
  where id = v_submitted_by;

  perform public.notify_housemates_except(
    v_house_id,
    v_submitted_by,
    v_submitted_by,
    'chore_completed',
    'Chore completed',
    coalesce(v_completer_name, 'Someone')
      || ' completed "'
      || v_chore_title
      || '"',
    jsonb_build_object('path', '/chores', 'chore_id', v_chore_id)
  );
end;
$$;

-- complete_chore + chore completed notifications
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
  v_chore_title text;
  v_completer_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_house_admin() then
    raise exception 'Only admins can instantly complete chores';
  end if;

  select house_id, xp_reward, assigned_to, last_completed_at, frequency, title
  into v_house_id, v_xp, v_assigned_to, v_completed_at, v_frequency, v_chore_title
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

  select username into v_completer_name
  from public.profiles
  where id = v_recipient;

  perform public.notify_housemates_except(
    v_house_id,
    v_recipient,
    v_recipient,
    'chore_completed',
    'Chore completed',
    coalesce(v_completer_name, 'Someone')
      || ' completed "'
      || v_chore_title
      || '"',
    jsonb_build_object('path', '/chores', 'chore_id', p_chore_id)
  );
end;
$$;

-- Expense notifications (equal split)
create or replace function public.create_expense_with_equal_split(
  p_title text,
  p_amount_cents integer,
  p_source public.expense_source default 'ledger'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
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
  v_actor_name text;
  v_amount_display text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  p_title := trim(p_title);
  if p_title = '' then
    raise exception 'Title required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid amount';
  end if;

  insert into public.expenses (house_id, payer_id, title, amount_cents, strategy, source)
  values (v_house_id, v_user_id, p_title, p_amount_cents, 'equal', p_source)
  returning id into v_expense_id;

  select coalesce(array_agg(id order by id), '{}')
  into v_member_ids
  from public.profiles
  where house_id = v_house_id;

  v_n := coalesce(array_length(v_member_ids, 1), 0);
  if v_n <= 1 then
    return v_expense_id;
  end if;

  v_base_share := p_amount_cents / v_n;
  v_remainder := p_amount_cents - v_base_share * v_n;

  select coalesce(array_agg(m order by m), '{}')
  into v_debtor_ids
  from unnest(v_member_ids) as m
  where m <> v_user_id;

  v_debtor_count := coalesce(array_length(v_debtor_ids, 1), 0);
  if v_debtor_count = 0 then
    return v_expense_id;
  end if;

  for v_idx in 1..v_debtor_count loop
    v_extra := case when v_idx <= v_remainder then 1 else 0 end;
    insert into public.debt_ledger (
      house_id,
      debtor_id,
      creditor_id,
      amount_cents,
      expense_id
    )
    values (
      v_house_id,
      v_debtor_ids[v_idx],
      v_user_id,
      v_base_share + v_extra,
      v_expense_id
    );
  end loop;

  select username into v_actor_name
  from public.profiles
  where id = v_user_id;

  v_amount_display := trim(
    to_char(p_amount_cents / 100.0, 'FM999999990.00')
  );

  perform public.notify_housemates_except(
    v_house_id,
    v_user_id,
    v_user_id,
    'expense_added',
    'New expense',
    coalesce(v_actor_name, 'Someone')
      || ' added "'
      || p_title
      || '" ($'
      || v_amount_display
      || ')',
    jsonb_build_object('path', '/ledger', 'expense_id', v_expense_id)
  );

  return v_expense_id;
end;
$$;

-- Expense notifications (exact split)
create or replace function public.create_expense_with_exact_split(
  p_title text,
  p_amount_cents integer,
  p_shares jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_expense_id uuid;
  v_member_count integer;
  v_share_sum integer := 0;
  v_share record;
  v_member_id uuid;
  v_share_cents integer;
  v_actor_name text;
  v_amount_display text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  p_title := trim(p_title);
  if p_title = '' then
    raise exception 'Title required';
  end if;

  if p_amount_cents is null or p_amount_cents <= 0 then
    raise exception 'Invalid amount';
  end if;

  if p_shares is null or jsonb_typeof(p_shares) <> 'array' then
    raise exception 'Shares required';
  end if;

  select count(*)::integer
  into v_member_count
  from public.profiles
  where house_id = v_house_id;

  if v_member_count <= 1 then
    insert into public.expenses (house_id, payer_id, title, amount_cents, strategy)
    values (v_house_id, v_user_id, p_title, p_amount_cents, 'exact')
    returning id into v_expense_id;
    return v_expense_id;
  end if;

  if jsonb_array_length(p_shares) <> v_member_count then
    raise exception 'Share count must match house members';
  end if;

  for v_share in
    select *
    from jsonb_to_recordset(p_shares) as x(member_id uuid, amount_cents integer)
  loop
    v_member_id := v_share.member_id;
    v_share_cents := v_share.amount_cents;

    if v_member_id is null then
      raise exception 'Invalid member in shares';
    end if;

    if v_share_cents is null or v_share_cents < 0 then
      raise exception 'Invalid share amount';
    end if;

    if not exists (
      select 1
      from public.profiles
      where id = v_member_id and house_id = v_house_id
    ) then
      raise exception 'Member not in house';
    end if;

    v_share_sum := v_share_sum + v_share_cents;
  end loop;

  if v_share_sum <> p_amount_cents then
    raise exception 'Shares must equal total amount';
  end if;

  insert into public.expenses (house_id, payer_id, title, amount_cents, strategy)
  values (v_house_id, v_user_id, p_title, p_amount_cents, 'exact')
  returning id into v_expense_id;

  for v_share in
    select *
    from jsonb_to_recordset(p_shares) as x(member_id uuid, amount_cents integer)
  loop
    v_member_id := v_share.member_id;
    v_share_cents := v_share.amount_cents;

    if v_member_id <> v_user_id and v_share_cents > 0 then
      insert into public.debt_ledger (
        house_id,
        debtor_id,
        creditor_id,
        amount_cents,
        expense_id
      )
      values (
        v_house_id,
        v_member_id,
        v_user_id,
        v_share_cents,
        v_expense_id
      );
    end if;
  end loop;

  select username into v_actor_name
  from public.profiles
  where id = v_user_id;

  v_amount_display := trim(
    to_char(p_amount_cents / 100.0, 'FM999999990.00')
  );

  perform public.notify_housemates_except(
    v_house_id,
    v_user_id,
    v_user_id,
    'expense_added',
    'New expense',
    coalesce(v_actor_name, 'Someone')
      || ' added "'
      || p_title
      || '" ($'
      || v_amount_display
      || ')',
    jsonb_build_object('path', '/ledger', 'expense_id', v_expense_id)
  );

  return v_expense_id;
end;
$$;

-- Reward redemption notifications
create or replace function public.redeem_reward(p_house_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_house_id uuid;
  v_reward public.house_rewards%rowtype;
  v_total_xp integer;
  v_reward_key text;
  v_actor_name text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  v_house_id := public.user_house_id();
  if v_house_id is null then
    raise exception 'Join a house first';
  end if;

  select * into v_reward
  from public.house_rewards
  where id = p_house_reward_id
    and house_id = v_house_id
    and is_enabled = true;

  if not found then
    raise exception 'Invalid reward';
  end if;

  select total_xp into v_total_xp
  from public.profiles
  where id = v_user_id
  for update;

  if v_total_xp is null then
    raise exception 'Profile not found';
  end if;

  if v_total_xp < v_reward.xp_cost then
    raise exception 'Insufficient XP';
  end if;

  update public.profiles
  set total_xp = total_xp - v_reward.xp_cost
  where id = v_user_id;

  v_reward_key := coalesce(v_reward.preset_key, v_reward.id::text);

  insert into public.reward_redemptions (
    house_id,
    profile_id,
    reward_key,
    xp_spent,
    house_reward_id
  )
  values (
    v_house_id,
    v_user_id,
    v_reward_key,
    v_reward.xp_cost,
    v_reward.id
  );

  select username into v_actor_name
  from public.profiles
  where id = v_user_id;

  perform public.notify_housemates_except(
    v_house_id,
    v_user_id,
    v_user_id,
    'reward_redeemed',
    'Reward claimed',
    coalesce(v_actor_name, 'Someone')
      || ' redeemed "'
      || v_reward.title
      || '"',
    jsonb_build_object(
      'path', '/rewards',
      'house_reward_id', v_reward.id
    )
  );
end;
$$;

revoke all on function public.create_notification(uuid, uuid, uuid, public.notification_type, text, text, jsonb) from public;
revoke all on function public.notify_housemates_except(uuid, uuid, uuid, public.notification_type, text, text, jsonb) from public;
revoke all on function public.notify_chore_assigned(uuid, uuid, uuid) from public;
revoke all on function public.should_send_chore_reminder(uuid, uuid, uuid, public.chore_frequency, timestamptz, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.send_chore_reminders() from public;

grant execute on function public.send_chore_reminders() to authenticated;
grant execute on function public.send_chore_reminders() to service_role;
grant execute on function public.should_send_chore_reminder(uuid, uuid, uuid, public.chore_frequency, timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;
