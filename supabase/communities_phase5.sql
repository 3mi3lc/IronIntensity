-- Communities: Phase 5 — promote-to-admin + richer reports
-- Run this once in the Supabase SQL editor, after phases 1-4.

begin;

-- Promote a member to admin (admin only). Lets a gym have more than one mod.
create or replace function promote_member(p_community_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_community_admin(p_community_id, auth.uid()) then raise exception 'not an admin'; end if;
  update community_members set role = 'admin'
    where community_id = p_community_id and user_id = p_user_id;
end; $$;

-- community_reports now also resolves the reported member's name for 'member'
-- targets. Return type changes, so drop before recreating.
drop function if exists community_reports(uuid);
create or replace function community_reports(p_community_id uuid)
returns table (
  id uuid, target_type text, target_id uuid, reason text,
  reporter_username text, created_at timestamptz,
  event_type text, event_actor text, event_payload jsonb,
  target_username text
)
language sql security definer stable set search_path = public as $$
  select r.id, r.target_type, r.target_id, r.reason,
    ru.username, r.created_at,
    e.type, eu.username, e.payload,
    tu.username
  from reports r
  join users ru on ru.id = r.reporter_user_id
  left join feed_events e on r.target_type = 'feed_event' and e.id = r.target_id
  left join users eu on eu.id = e.actor_user_id
  left join users tu on r.target_type = 'member' and tu.id = r.target_id
  where r.community_id = p_community_id
    and not r.resolved
    and is_community_admin(p_community_id, auth.uid())
  order by r.created_at desc;
$$;

commit;
