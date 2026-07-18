-- Communities: list who is attending a planned session (owner + RSVPs)
-- Run in the Supabase SQL editor after the community phases.

create or replace function session_attendees(p_session_id uuid)
returns table (user_id uuid, username text, is_owner boolean)
language sql security definer stable set search_path = public as $$
  select u.id, u.username, (u.id = s.user_id) as is_owner
  from planned_sessions s
  join users u
    on u.id = s.user_id
    or u.id in (select r.user_id from session_rsvps r where r.planned_session_id = s.id)
  where s.id = p_session_id
    and is_community_member(s.community_id, auth.uid())
  order by (u.id = s.user_id) desc, u.username;
$$;
