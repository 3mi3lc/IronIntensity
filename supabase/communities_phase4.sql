-- Communities: Phase 4 — discovery + moderation
-- Run this once in the Supabase SQL editor, after phases 1-3.

begin;

-- ============================================================
-- Discovery: public communities
-- ============================================================

alter table communities add column if not exists is_public boolean not null default false;
create index if not exists communities_public on communities (is_public) where is_public;

-- Visible to members OR when public (so non-members can discover).
drop policy if exists communities_select on communities;
create policy communities_select on communities for select
  using (is_public or is_community_member(id, auth.uid()));

-- Admin helper (mirrors is_community_member, but requires the admin role).
create or replace function is_community_admin(cid uuid, uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from community_members m
    where m.community_id = cid and m.user_id = uid and m.role = 'admin'
  );
$$;

-- my_communities now also reports is_public.
create or replace function my_communities()
returns table (id uuid, name text, invite_code text, role text, member_count bigint, is_public boolean)
language sql security definer stable set search_path = public as $$
  select c.id, c.name, c.invite_code, m.role,
    (select count(*) from community_members mm where mm.community_id = c.id),
    c.is_public
  from communities c
  join community_members m on m.community_id = c.id and m.user_id = auth.uid()
  order by c.name;
$$;

-- Browse/search public communities (non-members included).
create or replace function search_public_communities(p_query text)
returns table (id uuid, name text, member_count bigint, is_member boolean)
language sql security definer stable set search_path = public as $$
  select c.id, c.name,
    (select count(*) from community_members mm where mm.community_id = c.id),
    is_community_member(c.id, auth.uid())
  from communities c
  where c.is_public
    and (coalesce(trim(p_query), '') = '' or c.name ilike '%' || p_query || '%')
  order by c.name
  limit 50;
$$;

-- Join a public community without an invite code.
create or replace function join_public_community(p_id uuid)
returns communities language plpgsql security definer set search_path = public as $$
declare c communities;
begin
  select * into c from communities where id = p_id;
  if not found then raise exception 'not found'; end if;
  if not c.is_public then raise exception 'not public'; end if;
  insert into community_members (community_id, user_id, role)
    values (c.id, auth.uid(), 'member') on conflict do nothing;
  return c;
end; $$;

-- Admin: publish / unpublish a community.
create or replace function set_community_visibility(p_id uuid, p_public boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_community_admin(p_id, auth.uid()) then raise exception 'not an admin'; end if;
  update communities set is_public = p_public where id = p_id;
end; $$;

-- ============================================================
-- Moderation
-- ============================================================

-- Admin: remove a (non-admin) member.
create or replace function remove_member(p_community_id uuid, p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_community_admin(p_community_id, auth.uid()) then raise exception 'not an admin'; end if;
  if p_user_id = auth.uid() then raise exception 'cannot remove yourself'; end if;
  delete from community_members
    where community_id = p_community_id and user_id = p_user_id and role <> 'admin';
end; $$;

-- A feed post can be deleted by its author or a community admin.
drop policy if exists feed_delete on feed_events;
create policy feed_delete on feed_events for delete
  using (actor_user_id = auth.uid() or is_community_admin(community_id, auth.uid()));

-- Reports (content flagged by members, reviewed by admins).
create table if not exists reports (
  id                uuid primary key default gen_random_uuid(),
  community_id      uuid not null references communities(id) on delete cascade,
  reporter_user_id  uuid not null references auth.users(id) on delete cascade,
  target_type       text not null check (target_type in ('feed_event','member')),
  target_id         uuid not null,
  reason            text,
  resolved          boolean not null default false,
  created_at        timestamptz not null default now()
);
create index if not exists reports_community_unresolved on reports (community_id) where not resolved;

alter table reports enable row level security;

drop policy if exists reports_insert on reports;
create policy reports_insert on reports for insert
  with check (reporter_user_id = auth.uid() and is_community_member(community_id, auth.uid()));

drop policy if exists reports_select on reports;
create policy reports_select on reports for select
  using (is_community_admin(community_id, auth.uid()));

drop policy if exists reports_update on reports;
create policy reports_update on reports for update
  using (is_community_admin(community_id, auth.uid()));

-- Admin: list unresolved reports, enriched with the reported post when applicable.
create or replace function community_reports(p_community_id uuid)
returns table (
  id uuid, target_type text, target_id uuid, reason text,
  reporter_username text, created_at timestamptz,
  event_type text, event_actor text, event_payload jsonb
)
language sql security definer stable set search_path = public as $$
  select r.id, r.target_type, r.target_id, r.reason,
    ru.username, r.created_at,
    e.type, eu.username, e.payload
  from reports r
  join users ru on ru.id = r.reporter_user_id
  left join feed_events e on r.target_type = 'feed_event' and e.id = r.target_id
  left join users eu on eu.id = e.actor_user_id
  where r.community_id = p_community_id
    and not r.resolved
    and is_community_admin(p_community_id, auth.uid())
  order by r.created_at desc;
$$;

create or replace function resolve_report(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update reports set resolved = true
  where id = p_id and is_community_admin(community_id, auth.uid());
end; $$;

commit;
