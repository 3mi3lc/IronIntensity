-- Communities: make activity emission idempotent (fixes duplicate feed posts)
-- Run in the Supabase SQL editor after the community phases.
--
-- Each queued activity batch (a local pending_activity row) has a stable id.
-- emit_activity now stamps a dedupe_key per (batch, event index) so re-emitting
-- the same batch — from overlapping syncs or a retry after a crash — can never
-- create a second feed post. Enforced by a partial unique index.

begin;

alter table feed_events add column if not exists dedupe_key text;
create unique index if not exists feed_events_dedupe
  on feed_events (community_id, dedupe_key) where dedupe_key is not null;

-- Old single-arg version is replaced by one that takes the batch source id.
drop function if exists emit_activity(jsonb);

create or replace function emit_activity(p_events jsonb, p_source text default null)
returns void language plpgsql security definer set search_path = public as $$
declare cid uuid; rec record;
begin
  for cid in select community_id from community_members where user_id = auth.uid()
  loop
    for rec in
      select value as ev, ordinality - 1 as idx
      from jsonb_array_elements(p_events) with ordinality
    loop
      insert into feed_events (community_id, actor_user_id, type, payload, dedupe_key)
      values (
        cid, auth.uid(), rec.ev->>'type', coalesce(rec.ev->'payload', '{}'::jsonb),
        case when p_source is null then null else p_source || ':' || rec.idx end
      )
      on conflict (community_id, dedupe_key) where dedupe_key is not null do nothing;
    end loop;
  end loop;
end; $$;

commit;
