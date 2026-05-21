-- System dashboard: platform admins and aggregate usage stats (SECURITY DEFINER).

create table if not exists public.system_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Function must exist before RLS policies that reference it.
create or replace function public.is_system_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.system_admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_system_admin() from public;
grant execute on function public.is_system_admin() to authenticated;

alter table public.system_admins enable row level security;

drop policy if exists "system_admins_select_own" on public.system_admins;
create policy "system_admins_select_own"
  on public.system_admins for select
  to authenticated
  using (user_id = auth.uid());

-- Only existing system admins can grant new admins (bootstrap via SQL in Supabase dashboard).
drop policy if exists "system_admins_insert_by_admin" on public.system_admins;
create policy "system_admins_insert_by_admin"
  on public.system_admins for insert
  to authenticated
  with check (public.is_system_admin());

drop policy if exists "system_admins_delete_by_admin" on public.system_admins;
create policy "system_admins_delete_by_admin"
  on public.system_admins for delete
  to authenticated
  using (public.is_system_admin());

create or replace function public.get_system_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_stats jsonb;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_system_admin() then
    raise exception 'Forbidden';
  end if;

  select jsonb_build_object(
    'generated_at', now(),
    'users', jsonb_build_object(
      'total', (select count(*)::int from public.profiles),
      'with_house', (select count(*)::int from public.profiles where house_id is not null),
      'without_house', (select count(*)::int from public.profiles where house_id is null),
      'created_last_7d', (
        select count(*)::int from public.profiles
        where created_at >= now() - interval '7 days'
      ),
      'created_last_30d', (
        select count(*)::int from public.profiles
        where created_at >= now() - interval '30 days'
      )
    ),
    'houses', jsonb_build_object(
      'total', (select count(*)::int from public.houses),
      'created_last_7d', (
        select count(*)::int from public.houses
        where created_at >= now() - interval '7 days'
      ),
      'created_last_30d', (
        select count(*)::int from public.houses
        where created_at >= now() - interval '30 days'
      ),
      'avg_members', coalesce((
        select round(avg(member_count)::numeric, 1)
        from (
          select count(*)::numeric as member_count
          from public.profiles
          where house_id is not null
          group by house_id
        ) m
      ), 0)
    ),
    'chores', jsonb_build_object(
      'total', (select count(*)::int from public.chores),
      'completions_pending', (
        select count(*)::int from public.chore_completions where status = 'pending'
      ),
      'completions_approved', (
        select count(*)::int from public.chore_completions where status = 'approved'
      ),
      'completions_last_7d', (
        select count(*)::int from public.chore_completions
        where submitted_at >= now() - interval '7 days'
      )
    ),
    'expenses', jsonb_build_object(
      'total', (select count(*)::int from public.expenses),
      'total_amount_cents', coalesce((select sum(amount_cents)::bigint from public.expenses), 0),
      'ledger_count', (
        select count(*)::int from public.expenses where source = 'ledger'
      ),
      'shopping_count', (
        select count(*)::int from public.expenses where source = 'shopping'
      ),
      'last_7d_count', (
        select count(*)::int from public.expenses
        where created_at >= now() - interval '7 days'
      ),
      'last_7d_amount_cents', coalesce((
        select sum(amount_cents)::bigint from public.expenses
        where created_at >= now() - interval '7 days'
      ), 0),
      'last_30d_count', (
        select count(*)::int from public.expenses
        where created_at >= now() - interval '30 days'
      )
    ),
    'debts', jsonb_build_object(
      'total_entries', (select count(*)::int from public.debt_ledger),
      'unsettled_count', (
        select count(*)::int from public.debt_ledger where settled_at is null
      ),
      'unsettled_amount_cents', coalesce((
        select sum(amount_cents)::bigint from public.debt_ledger where settled_at is null
      ), 0)
    ),
    'notifications', jsonb_build_object(
      'total', (select count(*)::int from public.notifications),
      'unread', (select count(*)::int from public.notifications where read_at is null)
    ),
    'shopping', jsonb_build_object(
      'items_total', (select count(*)::int from public.shopping_list_items)
    ),
    'rewards', jsonb_build_object(
      'redemptions_total', (select count(*)::int from public.reward_redemptions),
      'xp_spent_total', coalesce((select sum(xp_spent)::bigint from public.reward_redemptions), 0)
    ),
    'top_houses', coalesce((
      select jsonb_agg(row order by row -> 'expense_count' desc)
      from (
        select jsonb_build_object(
          'id', h.id,
          'name', h.name,
          'member_count', (
            select count(*)::int from public.profiles p where p.house_id = h.id
          ),
          'expense_count', (
            select count(*)::int from public.expenses e where e.house_id = h.id
          ),
          'created_at', h.created_at
        ) as row
        from public.houses h
        order by (
          select count(*) from public.expenses e where e.house_id = h.id
        ) desc
        limit 10
      ) t
    ), '[]'::jsonb)
  )
  into v_stats;

  return v_stats;
end;
$$;

revoke all on function public.get_system_stats() from public;
grant execute on function public.get_system_stats() to authenticated;
