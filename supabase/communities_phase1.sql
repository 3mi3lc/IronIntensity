-- Communities: Phase 1 backend
-- Run this once in the Supabase SQL editor. See docs/COMMUNITIES_PHASE1_SPEC.md.
--
-- Contents:
--   1. Tables + indexes
--   2. is_community_member() helper (avoids RLS recursion)
--   3. Row-level security policies
--   4. Security-definer RPCs: create_community, join_community, emit_activity
--   5. Read RPCs: my_communities, community_members, community_feed, leaderboards

begin;

-- ============================================================
-- 1. Tables
-- ============================================================

create table if not exists communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table if not exists community_members (
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('admin','member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table if not exists feed_events (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in
                  ('workout_completed','pr','streak_milestone','badge_unlocked')),
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table if not exists kudos (
  id            uuid primary key default gen_random_uuid(),
  feed_event_id uuid not null references feed_events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reaction      text not null default 'clap',
  created_at    timestamptz not null default now(),
  unique (feed_event_id, user_id, reaction)
);

create index if not exists feed_events_community_created
  on feed_events (community_id, created_at desc);
create index if not exists community_members_user
  on community_members (user_id);
create index if not exists kudos_event
  on kudos (feed_event_id);

-- ============================================================
-- 2. Membership helper (security definer so RLS policies that
--    reference community_members do not recurse)
-- ============================================================

create or replace function is_community_member(cid uuid, uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from community_members m
    where m.community_id = cid and m.user_id = uid
  );
$$;

-- ============================================================
-- 3. Row-level security
-- ============================================================

alter table communities       enable row level security;
alter table community_members enable row level security;
alter table feed_events       enable row level security;
alter table kudos             enable row level security;

-- communities: visible only to members; creation stamps the creator
drop policy if exists communities_select on communities;
create policy communities_select on communities for select
  using (is_community_member(id, auth.uid()));

drop policy if exists communities_insert on communities;
create policy communities_insert on communities for insert
  with check (created_by = auth.uid());

-- members: see co-members of your communities; remove only yourself (leave)
drop policy if exists members_select on community_members;
create policy members_select on community_members for select
  using (is_community_member(community_id, auth.uid()));

drop policy if exists members_delete_self on community_members;
create policy members_delete_self on community_members for delete
  using (user_id = auth.uid());

-- feed: readable by members; inserts happen only through emit_activity()
drop policy if exists feed_select on feed_events;
create policy feed_select on feed_events for select
  using (is_community_member(community_id, auth.uid()));

-- kudos: read/insert scoped to the event's community; delete your own
drop policy if exists kudos_select on kudos;
create policy kudos_select on kudos for select
  using (is_community_member(
    (select community_id from feed_events e where e.id = feed_event_id), auth.uid()));

drop policy if exists kudos_insert on kudos;
create policy kudos_insert on kudos for insert
  with check (user_id = auth.uid() and is_community_member(
    (select community_id from feed_events e where e.id = feed_event_id), auth.uid()));

drop policy if exists kudos_delete_self on kudos;
create policy kudos_delete_self on kudos for delete
  using (user_id = auth.uid());

-- ============================================================
-- 4. Write RPCs (security definer)
-- ============================================================

-- Create a community and make the creator its first admin, atomically.
create or replace function create_community(p_name text)
returns communities language plpgsql security definer
set search_path = public as $$
declare c communities; code text;
begin
  code := upper(substr(md5(gen_random_uuid()::text), 1, 6));  -- e.g. "A3F9K2"
  insert into communities (name, invite_code, created_by)
    values (p_name, code, auth.uid()) returning * into c;
  insert into community_members (community_id, user_id, role)
    values (c.id, auth.uid(), 'admin');
  return c;
end; $$;

-- Join by invite code (validates the code, inserts membership).
create or replace function join_community(p_code text)
returns communities language plpgsql security definer
set search_path = public as $$
declare c communities;
begin
  select * into c from communities where invite_code = upper(trim(p_code));
  if not found then raise exception 'invalid invite code'; end if;
  insert into community_members (community_id, user_id, role)
    values (c.id, auth.uid(), 'member')
    on conflict do nothing;
  return c;
end; $$;

-- Fan one workout's events out to every community the actor belongs to.
-- p_events is a jsonb array of { type, payload } objects.
create or replace function emit_activity(p_events jsonb)
returns void language plpgsql security definer
set search_path = public as $$
declare cid uuid; ev jsonb;
begin
  for cid in select community_id from community_members where user_id = auth.uid()
  loop
    for ev in select * from jsonb_array_elements(p_events)
    loop
      insert into feed_events (community_id, actor_user_id, type, payload)
      values (cid, auth.uid(), ev->>'type', coalesce(ev->'payload', '{}'::jsonb));
    end loop;
  end loop;
end; $$;

-- ============================================================
-- 5. Read RPCs (security definer; each guards on membership)
-- ============================================================

-- Communities the caller belongs to, with member counts and the caller's role.
create or replace function my_communities()
returns table (id uuid, name text, invite_code text, role text, member_count bigint)
language sql security definer stable set search_path = public as $$
  select c.id, c.name, c.invite_code, m.role,
    (select count(*) from community_members mm where mm.community_id = c.id)
  from communities c
  join community_members m on m.community_id = c.id and m.user_id = auth.uid()
  order by c.name;
$$;

-- Members of a community (caller must be a member).
create or replace function community_members_list(p_community_id uuid)
returns table (user_id uuid, username text, role text, joined_at timestamptz)
language sql security definer stable set search_path = public as $$
  select m.user_id, u.username, m.role, m.joined_at
  from community_members m
  join users u on u.id = m.user_id
  where m.community_id = p_community_id
    and is_community_member(p_community_id, auth.uid())
  order by m.role, u.username;
$$;

-- Feed for a community, newest first, enriched with actor name, kudos count,
-- and whether the caller has given kudos (caller must be a member).
create or replace function community_feed(p_community_id uuid, p_limit int default 50)
returns table (
  id uuid, actor_user_id uuid, actor_username text, type text,
  payload jsonb, created_at timestamptz, kudos_count bigint, i_kudosed boolean
)
language sql security definer stable set search_path = public as $$
  select e.id, e.actor_user_id, u.username, e.type, e.payload, e.created_at,
    (select count(*) from kudos k where k.feed_event_id = e.id),
    exists (select 1 from kudos k where k.feed_event_id = e.id and k.user_id = auth.uid())
  from feed_events e
  join users u on u.id = e.actor_user_id
  where e.community_id = p_community_id
    and is_community_member(p_community_id, auth.uid())
  order by e.created_at desc
  limit p_limit;
$$;

-- Weekly consistency: completed sessions per member since Monday.
create or replace function community_leaderboard_consistency(p_community_id uuid)
returns table (user_id uuid, username text, score bigint)
language sql security definer stable set search_path = public as $$
  select e.actor_user_id, u.username, count(*) as score
  from feed_events e
  join users u on u.id = e.actor_user_id
  where e.community_id = p_community_id
    and e.type = 'workout_completed'
    and e.created_at >= date_trunc('week', now())
    and is_community_member(p_community_id, auth.uid())
  group by e.actor_user_id, u.username
  order by score desc, u.username;
$$;

-- Weekly most-improved: percent change in volume vs the member's own prior
-- 4-week average. Each member is measured against their own history, so no
-- absolute number is compared across members.
create or replace function community_leaderboard_improved(p_community_id uuid)
returns table (user_id uuid, username text, score numeric)
language sql security definer stable set search_path = public as $$
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
         else round((wk.vol - base.avg_vol) / base.avg_vol * 100, 1) end as score
  from wk
  join users u on u.id = wk.actor_user_id
  left join base on base.actor_user_id = wk.actor_user_id
  where is_community_member(p_community_id, auth.uid())
  order by score desc nulls last, u.username;
$$;

commit;
