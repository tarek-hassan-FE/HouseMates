-- In-app notifications and payment reminder RPCs with per-recipient cooldown.

do $$ begin
  create type public.notification_type as enum ('payment_reminder');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  house_id uuid not null references public.houses (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

create index if not exists notifications_reminder_cooldown_idx
  on public.notifications (actor_id, recipient_id, type, created_at desc);

alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (
    recipient_id = auth.uid()
    and house_id = public.user_house_id()
  );

-- Allow actors to read payment reminders they sent (cooldown UI).
create policy "notifications_select_sent_reminders"
  on public.notifications for select
  to authenticated
  using (
    actor_id = auth.uid()
    and type = 'payment_reminder'
    and house_id = public.user_house_id()
  );

create policy "notifications_update_own_read"
  on public.notifications for update
  to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Send payment reminders to debtors who owe the caller (creditor-only).
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

    insert into public.notifications (
      house_id,
      recipient_id,
      actor_id,
      type,
      title,
      body,
      payload
    ) values (
      v_house_id,
      v_debtor.debtor_id,
      v_user_id,
      'payment_reminder',
      'Payment reminder',
      coalesce(v_actor_name, 'A roommate')
        || ' reminded you to settle '
        || v_amount_display,
      jsonb_build_object('amount_cents', v_debtor.amount_cents)
    );

    v_notified_count := v_notified_count + 1;
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

create or replace function public.mark_notifications_read(p_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and id = any (p_ids)
    and read_at is null;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.notifications
  set read_at = now()
  where recipient_id = auth.uid()
    and read_at is null;
end;
$$;

revoke all on function public.send_payment_reminders() from public;
grant execute on function public.send_payment_reminders() to authenticated;

revoke all on function public.mark_notifications_read(uuid[]) from public;
grant execute on function public.mark_notifications_read(uuid[]) to authenticated;

revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_all_notifications_read() to authenticated;
