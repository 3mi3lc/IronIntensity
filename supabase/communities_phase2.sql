-- Communities: Phase 2 leaderboards
-- Run this once in the Supabase SQL editor, after communities_phase1.sql.
--
-- Consolidates the two weekly leaderboard functions into a single
-- community_leaderboard(community, metric, period) that adds:
--   * timeframes: week / month / all-time
--   * a raw-volume board
--   * a relative-strength board (strength-to-bodyweight ratio; the ratio is
--     computed on-device and emitted in the payload, so bodyweight itself never
--     reaches feed_events)
--
-- "improved" ignores the period and always compares this week vs the member's
-- own prior 4-week average, since it needs a baseline.

begin;

drop function if exists community_leaderboard_consistency(uuid);
drop function if exists community_leaderboard_improved(uuid);

create or replace function community_leaderboard(
  p_community_id uuid,
  p_metric text default 'consistency',
  p_period text default 'week'
)
returns table (user_id uuid, username text, score numeric)
language plpgsql security definer stable
set search_path = public as $$
declare v_start timestamptz;
begin
  -- Non-members get nothing.
  if not is_community_member(p_community_id, auth.uid()) then
    return;
  end if;

  v_start := case p_period
    when 'month' then date_trunc('month', now())
    when 'all'   then '-infinity'::timestamptz
    else date_trunc('week', now())
  end;

  if p_metric = 'consistency' then
    return query
      select e.actor_user_id, u.username, count(*)::numeric
      from feed_events e
      join users u on u.id = e.actor_user_id
      where e.community_id = p_community_id
        and e.type = 'workout_completed'
        and e.created_at >= v_start
      group by e.actor_user_id, u.username
      order by 3 desc, u.username;

  elsif p_metric = 'volume' then
    return query
      select e.actor_user_id, u.username,
             coalesce(sum((e.payload->>'total_volume')::numeric), 0)
      from feed_events e
      join users u on u.id = e.actor_user_id
      where e.community_id = p_community_id
        and e.type = 'workout_completed'
        and e.created_at >= v_start
      group by e.actor_user_id, u.username
      order by 3 desc, u.username;

  elsif p_metric = 'relative' then
    return query
      select e.actor_user_id, u.username,
             max((e.payload->>'relative_strength')::numeric)
      from feed_events e
      join users u on u.id = e.actor_user_id
      where e.community_id = p_community_id
        and e.type = 'workout_completed'
        and e.payload ? 'relative_strength'
        and e.created_at >= v_start
      group by e.actor_user_id, u.username
      order by 3 desc, u.username;

  elsif p_metric = 'improved' then
    return query
      with wk as (
        select actor_user_id, sum((payload->>'total_volume')::numeric) as vol
        from feed_events
        where community_id = p_community_id and type = 'workout_completed'
          and created_at >= date_trunc('week', now())
        group by actor_user_id
      ),
      base as (
        select actor_user_id, sum((payload->>'total_volume')::numeric) / 4.0 as avg_vol
        from feed_events
        where community_id = p_community_id and type = 'workout_completed'
          and created_at >= date_trunc('week', now()) - interval '4 weeks'
          and created_at <  date_trunc('week', now())
        group by actor_user_id
      )
      select wk.actor_user_id, u.username,
        case when coalesce(base.avg_vol, 0) = 0 then null
             else round((wk.vol - base.avg_vol) / base.avg_vol * 100, 1) end
      from wk
      join users u on u.id = wk.actor_user_id
      left join base on base.actor_user_id = wk.actor_user_id
      order by 3 desc nulls last, u.username;
  end if;
end; $$;

commit;
