# Communities: Phase 1 Technical Spec

_Status: proposed · Date: 2026-07-09 · Companion to [COMMUNITIES_PLAN.md](./COMMUNITIES_PLAN.md)_

Covers the Supabase data layer for Phase 1: four tables, RLS policies, the
security-definer functions that make join/create/emit work under RLS, the
`feed_events` payload shapes tied to the existing finish flow, and how events are
emitted while staying offline-first.

Scope reminder (from the plan): private invite-code friend groups, two weekly
leaderboards (consistency, most-improved), an activity feed with kudos. No
discovery, no gyms, no calendar.

---

## Where this plugs into existing code

The finish flow already computes every signal a feed needs, in
[`hooks/useWorkoutActions.ts`](../hooks/useWorkoutActions.ts) at
`finishWorkoutWithData` and `maybeShowFinishReward`:

- `newStreak` (consecutive weeks) and `newLongest` from `getWorkoutStreak`
- `newlyUnlocked` badges from `syncUnlockedAchievements`
- `prs` (with `bestPr`), `totalWorkouts`, `isBestVolumeMonth` from the stats repo

So event emission has no new computation to do; it reuses what the reward roll
already gathered. Bodyweight already exists locally as `body_weight_entries` and
syncs to Supabase, so the Phase 2 DOTS input is present but stays unused here.

---

## Tables (Postgres / Supabase)

The local user id (`users.id`) is the Supabase auth uid, so these reference
`auth.users(id)` and policies key off `auth.uid()`.

```sql
create table communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  invite_code text not null unique,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now()
);

create table community_members (
  community_id uuid not null references communities(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'member' check (role in ('admin','member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);

create table feed_events (
  id            uuid primary key default gen_random_uuid(),
  community_id  uuid not null references communities(id) on delete cascade,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  type          text not null check (type in
                  ('workout_completed','pr','streak_milestone','badge_unlocked')),
  payload       jsonb not null default '{}',
  created_at    timestamptz not null default now()
);

create table kudos (
  id            uuid primary key default gen_random_uuid(),
  feed_event_id uuid not null references feed_events(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  reaction      text not null default 'clap',
  created_at    timestamptz not null default now(),
  unique (feed_event_id, user_id, reaction)
);

create index feed_events_community_created on feed_events (community_id, created_at desc);
create index community_members_user on community_members (user_id);
create index kudos_event on kudos (feed_event_id);
```

Leaderboards are **not** a table. They are aggregates over `feed_events` (below).

---

## RLS policies

One gotcha up front: a `community_members` SELECT policy that itself queries
`community_members` recurses. The fix is a `security definer` helper so policy
evaluation does not re-enter RLS.

```sql
create or replace function is_community_member(cid uuid, uid uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from community_members m
    where m.community_id = cid and m.user_id = uid
  );
$$;

alter table communities       enable row level security;
alter table community_members enable row level security;
alter table feed_events       enable row level security;
alter table kudos             enable row level security;

-- communities: visible only to members; creation stamps the creator
create policy communities_select on communities for select
  using (is_community_member(id, auth.uid()));
create policy communities_insert on communities for insert
  with check (created_by = auth.uid());

-- members: you see co-members of your communities; you may remove yourself (leave)
create policy members_select on community_members for select
  using (is_community_member(community_id, auth.uid()));
create policy members_delete_self on community_members for delete
  using (user_id = auth.uid());
-- NOTE: joining is done via join_community() below, not a direct INSERT policy,
-- because you must insert yourself into a community you are not yet a member of.

-- feed: readable by members; inserts happen only through emit_activity() (definer),
-- so there is deliberately no client INSERT policy
create policy feed_select on feed_events for select
  using (is_community_member(community_id, auth.uid()));

-- kudos: read/insert scoped to the event's community; delete your own
create policy kudos_select on kudos for select
  using (is_community_member(
    (select community_id from feed_events e where e.id = feed_event_id), auth.uid()));
create policy kudos_insert on kudos for insert
  with check (user_id = auth.uid() and is_community_member(
    (select community_id from feed_events e where e.id = feed_event_id), auth.uid()));
create policy kudos_delete_self on kudos for delete
  using (user_id = auth.uid());
```

---

## Security-definer functions (create, join, emit)

Three operations cannot be expressed as plain RLS policies and run as
`security definer` RPCs instead.

```sql
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
  select * into c from communities where invite_code = p_code;
  if not found then raise exception 'invalid invite code'; end if;
  insert into community_members (community_id, user_id, role)
    values (c.id, auth.uid(), 'member')
    on conflict do nothing;
  return c;
end; $$;

-- Fan one workout's events out to every community the actor belongs to.
-- p_events is an array of { type, payload } objects.
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
      values (cid, auth.uid(), ev->>'type', ev->'payload');
    end loop;
  end loop;
end; $$;
```

---

## feed_events payload shapes

Grounded in the reward-engine signals, summaries only, no raw sets. One finish
can emit several events (a completed workout that also set a PR and hit a streak
milestone produces three).

```jsonc
// workout_completed  (always)
{ "type": "workout_completed",
  "payload": { "workout_name": "Push Day", "set_count": 18,
               "total_volume": 8450, "top_lift_label": "Bench Press" } }

// pr  (when prCount > 0; one event carrying the session summary)
// weight IS shown: a PR is an earned highlight the member is proud of.
// relative_strength is a Phase 2 add-on (needs bodyweight/DOTS); omitted for now.
{ "type": "pr",
  "payload": { "pr_count": 2, "exercise_name": "Bench Press",
               "weight": 100, "reps": 5 /* , "relative_strength": 1.4 (Phase 2) */ } }

// streak_milestone  (when currentStreak is a milestone week: 4,8,12,26,52,...)
{ "type": "streak_milestone", "payload": { "weeks": 12 } }

// badge_unlocked  (one per newly-unlocked achievement)
{ "type": "badge_unlocked",
  "payload": { "badge_id": "iron_50", "title": "50 Workouts", "icon": "🏋️" } }
```

`total_volume` is an aggregate, not a raw set, and it is what the most-improved
board consumes. Whether the card *displays* the number or only feeds the board is
a display choice; the recommendation is to show `set_count` + `top_lift_label` on
the card and let volume drive the ranking silently.

**PR weight visibility (decided):** a PR card **does** show the absolute weight
(`Bench Press, 100kg x 5`). A PR is an earned highlight the member wants seen, so
it is the one place a real weight surfaces. This is a deliberate carve-out from
the general "no raw set weights" rule, which still holds everywhere else
(ordinary sets and bodyweight stay hidden). In Phase 2 the PR card can also carry
a relative-strength figure (DOTS-derived, computed from the private bodyweight
input), shown as a score alongside the weight.

---

## Emitting events while staying offline-first

The client keeps writing workouts to local SQLite exactly as today. Event
emission must not require being online at finish time, so it mirrors the existing
sync pattern rather than calling Supabase inline:

1. At finish, `finishWorkoutWithData` builds the events array from the signals it
   already has and writes it to a new local `pending_activity` table
   (`id, payload_json, created_at, is_synced`).
2. `SyncService` gains one push step: for each unsynced `pending_activity` row,
   call `supabase.rpc('emit_activity', { p_events })`, then mark it synced. The
   server fans it out to the member's communities.
3. If the user is in no communities, `emit_activity` is a no-op, so the row still
   clears cleanly.

This keeps the finish flow instant and offline-safe, and reuses the
push-then-mark-synced shape every other entity already follows.

### Leaderboard queries (server-side aggregates)

Both boards read `feed_events`, cached per community. Sketches:

- **Weekly consistency:** `count(*)` of `workout_completed` events per
  `actor_user_id` in the community since the current Monday, ordered desc.
- **Weekly most-improved:** per member, sum of `payload->>'total_volume'` for the
  current week versus their own average weekly volume over the prior 4 weeks;
  rank by percent change. Because the baseline is each member's own history, no
  absolute number is ever compared across members or shown.

These can start as RPCs (`weekly_leaderboard(p_community_id, p_metric)`) and move
to a cached/scheduled aggregate if feed volume grows.

---

## Build checklist for Phase 1

1. Run the SQL above in the Supabase SQL editor (tables, indexes, RLS, functions).
2. Add `pending_activity` to `db/schema.ts` + a Drizzle migration.
3. Add a `repositories/communities.ts` for the RPC calls and feed/leaderboard reads.
4. Emit events from `finishWorkoutWithData`; add the push step to `db/sync.tsx`.
5. Build the four screens from the plan (list, create/join, community home, members).
