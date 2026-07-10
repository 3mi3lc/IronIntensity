-- Communities: Phase 3 shared calendar
-- Run this once in the Supabase SQL editor, after communities_phase1.sql and
-- communities_phase2.sql.
--
-- Planned sessions (with RSVP + owner check-in) and recurring weekly schedules,
-- all scoped to a community and member-guarded via is_community_member().

begin;

-- ============================================================
-- Tables
-- ============================================================

create table if not exists planned_sessions (
  id             uuid primary key default gen_random_uuid(),
  community_id   uuid not null references communities(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  scheduled_date date not null,
  scheduled_time text,                 -- 'HH:MM', optional
  title          text,
  checked_in_at  timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists session_rsvps (
  planned_session_id uuid not null references planned_sessions(id) on delete cascade,
  user_id            uuid not null references auth.users(id) on delete cascade,
  created_at         timestamptz not null default now(),
  primary key (planned_session_id, user_id)
);

create table if not exists recurring_schedules (
  community_id   uuid not null references communities(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  weekdays       int[] not null,       -- ISO 1=Mon .. 7=Sun
  scheduled_time text,
  title          text,
  updated_at     timestamptz not null default now(),
  primary key (community_id, user_id)
);

create index if not exists planned_sessions_community_date
  on planned_sessions (community_id, scheduled_date);

-- ============================================================
-- RLS
-- ============================================================

alter table planned_sessions    enable row level security;
alter table session_rsvps       enable row level security;
alter table recurring_schedules enable row level security;

-- planned_sessions: members read; owner inserts/updates/deletes their own
drop policy if exists planned_sessions_select on planned_sessions;
create policy planned_sessions_select on planned_sessions for select
  using (is_community_member(community_id, auth.uid()));

drop policy if exists planned_sessions_insert on planned_sessions;
create policy planned_sessions_insert on planned_sessions for insert
  with check (user_id = auth.uid() and is_community_member(community_id, auth.uid()));

drop policy if exists planned_sessions_update on planned_sessions;
create policy planned_sessions_update on planned_sessions for update
  using (user_id = auth.uid());

drop policy if exists planned_sessions_delete on planned_sessions;
create policy planned_sessions_delete on planned_sessions for delete
  using (user_id = auth.uid());

-- session_rsvps: members of the session's community read; own rows add/remove
drop policy if exists rsvps_select on session_rsvps;
create policy rsvps_select on session_rsvps for select
  using (is_community_member(
    (select community_id from planned_sessions s where s.id = planned_session_id), auth.uid()));

drop policy if exists rsvps_insert on session_rsvps;
create policy rsvps_insert on session_rsvps for insert
  with check (user_id = auth.uid() and is_community_member(
    (select community_id from planned_sessions s where s.id = planned_session_id), auth.uid()));

drop policy if exists rsvps_delete on session_rsvps;
create policy rsvps_delete on session_rsvps for delete
  using (user_id = auth.uid());

-- recurring_schedules: members read; own row upsert/delete
drop policy if exists recurring_select on recurring_schedules;
create policy recurring_select on recurring_schedules for select
  using (is_community_member(community_id, auth.uid()));

drop policy if exists recurring_upsert on recurring_schedules;
create policy recurring_upsert on recurring_schedules for insert
  with check (user_id = auth.uid() and is_community_member(community_id, auth.uid()));

drop policy if exists recurring_update on recurring_schedules;
create policy recurring_update on recurring_schedules for update
  using (user_id = auth.uid());

drop policy if exists recurring_delete on recurring_schedules;
create policy recurring_delete on recurring_schedules for delete
  using (user_id = auth.uid());

-- ============================================================
-- RPCs
-- ============================================================

create or replace function create_planned_session(
  p_community_id uuid, p_date date, p_time text, p_title text
)
returns planned_sessions language plpgsql security definer
set search_path = public as $$
declare s planned_sessions;
begin
  if not is_community_member(p_community_id, auth.uid()) then
    raise exception 'not a member';
  end if;
  insert into planned_sessions (community_id, user_id, scheduled_date, scheduled_time, title)
    values (p_community_id, auth.uid(), p_date, nullif(trim(p_time), ''), nullif(trim(p_title), ''))
    returning * into s;
  return s;
end; $$;

-- Owner marks attendance on their own session.
create or replace function checkin_planned_session(p_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
begin
  update planned_sessions
    set checked_in_at = now()
    where id = p_id and user_id = auth.uid();
end; $$;

-- Upsert the caller's weekly schedule for a community.
create or replace function set_recurring_schedule(
  p_community_id uuid, p_weekdays int[], p_time text, p_title text
)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_community_member(p_community_id, auth.uid()) then
    raise exception 'not a member';
  end if;
  insert into recurring_schedules (community_id, user_id, weekdays, scheduled_time, title, updated_at)
    values (p_community_id, auth.uid(), p_weekdays, nullif(trim(p_time), ''), nullif(trim(p_title), ''), now())
    on conflict (community_id, user_id) do update
      set weekdays = excluded.weekdays,
          scheduled_time = excluded.scheduled_time,
          title = excluded.title,
          updated_at = now();
end; $$;

-- Upcoming sessions for a community, enriched for the caller.
create or replace function community_calendar(p_community_id uuid)
returns table (
  id uuid, user_id uuid, username text,
  scheduled_date date, scheduled_time text, title text,
  checked_in boolean, is_own boolean, rsvp_count bigint, i_rsvped boolean
)
language sql security definer stable set search_path = public as $$
  select s.id, s.user_id, u.username,
    s.scheduled_date, s.scheduled_time, s.title,
    s.checked_in_at is not null,
    s.user_id = auth.uid(),
    (select count(*) from session_rsvps r where r.planned_session_id = s.id),
    exists (select 1 from session_rsvps r where r.planned_session_id = s.id and r.user_id = auth.uid())
  from planned_sessions s
  join users u on u.id = s.user_id
  where s.community_id = p_community_id
    and s.scheduled_date >= current_date
    and is_community_member(p_community_id, auth.uid())
  order by s.scheduled_date, s.scheduled_time nulls last;
$$;

-- Every member's recurring weekly pattern.
create or replace function community_recurring(p_community_id uuid)
returns table (user_id uuid, username text, weekdays int[], scheduled_time text, title text)
language sql security definer stable set search_path = public as $$
  select r.user_id, u.username, r.weekdays, r.scheduled_time, r.title
  from recurring_schedules r
  join users u on u.id = r.user_id
  where r.community_id = p_community_id
    and is_community_member(p_community_id, auth.uid())
  order by u.username;
$$;

-- Per-member reliability: kept (checked-in) vs total past planned sessions.
create or replace function community_reliability(p_community_id uuid)
returns table (user_id uuid, username text, kept bigint, total bigint)
language sql security definer stable set search_path = public as $$
  select s.user_id, u.username,
    count(*) filter (where s.checked_in_at is not null),
    count(*)
  from planned_sessions s
  join users u on u.id = s.user_id
  where s.community_id = p_community_id
    and s.scheduled_date < current_date
    and is_community_member(p_community_id, auth.uid())
  group by s.user_id, u.username
  order by u.username;
$$;

commit;
