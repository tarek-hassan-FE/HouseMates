-- House rewards catalog (run in SQL editor after migration 20250608100000)

-- seed_house_rewards is idempotent per preset_key
-- select public.seed_house_rewards('<house_id>');
-- expect 7 rows with preset_key set

-- After seed, enabled presets are redeemable via:
-- select public.redeem_reward('<house_reward_uuid>');

-- Disabled rewards should fail:
-- update public.house_rewards set is_enabled = false where id = '<uuid>';
-- select public.redeem_reward('<uuid>');  -- raises 'Invalid reward'

-- Custom reward insert (as house admin via RLS) example:
-- insert into public.house_rewards (house_id, title, xp_cost, icon)
-- values (public.user_house_id(), 'Pizza night pick', 120, 'local_pizza');
