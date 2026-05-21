-- Revert system admin dashboard (use Supabase custom SQL / views instead)

drop function if exists public.get_system_stats();
drop function if exists public.is_system_admin();
drop table if exists public.system_admins;
