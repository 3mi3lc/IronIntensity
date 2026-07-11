-- Communities: remote push notifications
-- Run in the Supabase SQL editor after phases 1-5.
--
-- Requires the pg_net extension (async HTTP from Postgres). Enable it first in
-- Dashboard → Database → Extensions (or the statement below). Triggers on kudos,
-- RSVPs, and reports POST to Expo's push service for the target user's devices.

create extension if not exists pg_net;

-- ============================================================
-- Device push tokens
-- ============================================================

create table if not exists push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  platform   text,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user on push_tokens (user_id);

alter table push_tokens enable row level security;

-- Reads/deletes limited to your own tokens; writes go through the RPC below.
drop policy if exists push_tokens_select on push_tokens;
create policy push_tokens_select on push_tokens for select using (user_id = auth.uid());
drop policy if exists push_tokens_delete on push_tokens;
create policy push_tokens_delete on push_tokens for delete using (user_id = auth.uid());

-- Upsert the caller's token (handles a device switching users).
create or replace function register_push_token(p_token text, p_platform text)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update
    set user_id = auth.uid(), platform = p_platform, updated_at = now();
end; $$;

-- ============================================================
-- Sender (Expo push API via pg_net)
-- ============================================================

create or replace function send_push(p_user_id uuid, p_title text, p_body text, p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare msgs jsonb;
begin
  select coalesce(jsonb_agg(jsonb_build_object(
    'to', t.token, 'title', p_title, 'body', p_body, 'data', p_data, 'sound', 'default'
  )), '[]'::jsonb)
  into msgs
  from push_tokens t
  where t.user_id = p_user_id;

  if jsonb_array_length(msgs) = 0 then return; end if;

  perform net.http_post(
    url := 'https://exp.host/--/api/v2/push/send',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := msgs
  );
end; $$;

-- ============================================================
-- Triggers
-- ============================================================

-- Kudos → notify the post's author (not for self-kudos).
create or replace function on_kudos_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid; giver text;
begin
  select actor_user_id into author from feed_events where id = new.feed_event_id;
  if author is null or author = new.user_id then return new; end if;
  select username into giver from users where id = new.user_id;
  perform send_push(author, 'New kudos 👊',
    coalesce(giver, 'Someone') || ' gave you kudos',
    jsonb_build_object('type', 'kudos'));
  return new;
end; $$;
drop trigger if exists kudos_notify on kudos;
create trigger kudos_notify after insert on kudos for each row execute function on_kudos_notify();

-- RSVP → notify the session owner with the running count (not for self-RSVP).
create or replace function on_rsvp_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare owner uuid; comm uuid; who text; going bigint;
begin
  select user_id, community_id into owner, comm from planned_sessions where id = new.planned_session_id;
  if owner is null or owner = new.user_id then return new; end if;
  select username into who from users where id = new.user_id;
  select count(*) into going from session_rsvps where planned_session_id = new.planned_session_id;
  perform send_push(owner, 'Someone is in 💪',
    coalesce(who, 'Someone') || ' is joining your session (' || going || ' going)',
    jsonb_build_object('type', 'rsvp', 'community_id', comm));
  return new;
end; $$;
drop trigger if exists rsvp_notify on session_rsvps;
create trigger rsvp_notify after insert on session_rsvps for each row execute function on_rsvp_notify();

-- Report → notify every admin of the community (except the reporter).
create or replace function on_report_notify() returns trigger
language plpgsql security definer set search_path = public as $$
declare adm uuid;
begin
  for adm in
    select user_id from community_members
    where community_id = new.community_id and role = 'admin'
  loop
    if adm <> new.reporter_user_id then
      perform send_push(adm, 'New report 🚩',
        'A post or member was reported for review',
        jsonb_build_object('type', 'report', 'community_id', new.community_id));
    end if;
  end loop;
  return new;
end; $$;
drop trigger if exists report_notify on reports;
create trigger report_notify after insert on reports for each row execute function on_report_notify();
