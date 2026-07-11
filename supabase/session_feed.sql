-- Communities: planned sessions in the feed + notify members
-- Run in the Supabase SQL editor after communities phases 1-5 and notifications.sql
-- (this uses send_push from notifications.sql).
--
-- When someone plans a session: post a 'session_planned' event to the community
-- feed and push every other member. The feed exposes RSVP so members can join
-- straight from the feed. Deleting the session removes its feed post.

begin;

-- Allow the new feed event type.
alter table feed_events drop constraint if exists feed_events_type_check;
alter table feed_events add constraint feed_events_type_check
  check (type in ('workout_completed','pr','streak_milestone','badge_unlocked','session_planned'));

-- On plan: feed post + push to other members.
create or replace function on_planned_session() returns trigger
language plpgsql security definer set search_path = public as $$
declare who text; member uuid; whentext text;
begin
  select username into who from users where id = new.user_id;
  whentext := to_char(new.scheduled_date, 'Dy DD Mon') || coalesce(' at ' || new.scheduled_time, '');

  insert into feed_events (community_id, actor_user_id, type, payload)
  values (new.community_id, new.user_id, 'session_planned',
    jsonb_build_object(
      'session_id', new.id,
      'scheduled_date', new.scheduled_date,
      'scheduled_time', new.scheduled_time,
      'title', new.title
    ));

  for member in
    select user_id from community_members
    where community_id = new.community_id and user_id <> new.user_id
  loop
    perform send_push(member,
      coalesce(who, 'Someone') || ' planned a session',
      coalesce(new.title || ' · ', '') || whentext || '. Join?',
      jsonb_build_object('type', 'session', 'community_id', new.community_id));
  end loop;
  return new;
end; $$;
drop trigger if exists planned_session_notify on planned_sessions;
create trigger planned_session_notify after insert on planned_sessions
  for each row execute function on_planned_session();

-- On delete: remove the feed post for that session.
create or replace function on_planned_session_delete() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from feed_events
  where type = 'session_planned' and (payload->>'session_id')::uuid = old.id;
  return old;
end; $$;
drop trigger if exists planned_session_delete on planned_sessions;
create trigger planned_session_delete after delete on planned_sessions
  for each row execute function on_planned_session_delete();

-- community_feed now also returns RSVP state for session_planned events.
drop function if exists community_feed(uuid, int);
create or replace function community_feed(p_community_id uuid, p_limit int default 50)
returns table (
  id uuid, actor_user_id uuid, actor_username text, type text,
  payload jsonb, created_at timestamptz,
  kudos_count bigint, i_kudosed boolean,
  rsvp_count bigint, i_rsvped boolean
)
language sql security definer stable set search_path = public as $$
  select e.id, e.actor_user_id, u.username, e.type, e.payload, e.created_at,
    (select count(*) from kudos k where k.feed_event_id = e.id),
    exists (select 1 from kudos k where k.feed_event_id = e.id and k.user_id = auth.uid()),
    case when e.type = 'session_planned'
      then (select count(*) from session_rsvps r where r.planned_session_id = (e.payload->>'session_id')::uuid)
      else 0 end,
    case when e.type = 'session_planned'
      then exists (select 1 from session_rsvps r
                   where r.planned_session_id = (e.payload->>'session_id')::uuid and r.user_id = auth.uid())
      else false end
  from feed_events e
  join users u on u.id = e.actor_user_id
  where e.community_id = p_community_id
    and is_community_member(p_community_id, auth.uid())
  order by e.created_at desc
  limit p_limit;
$$;

commit;
