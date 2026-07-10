# Communities: Phase 3 Technical Spec — Shared Calendar

_Status: proposed · Date: 2026-07-10 · Companion to [COMMUNITIES_PLAN.md](./COMMUNITIES_PLAN.md)_

The shared community calendar: members plan training sessions others can see,
RSVP to them, check in when they show up, and publish a recurring weekly
schedule. Chosen scope: **everything** (core + check-in + recurring).

## Decisions locked

- **Lives as a third tab** in the community home: Feed · Leaderboard · Calendar.
- **A planned session** = a date (required), an optional time, and an optional
  title, scoped to one community.
- **Safety:** sharing is explicit-by-action (nothing is broadcast unless you
  create a plan), plans are deletable, and there is no location data — only a
  time. So no separate privacy toggle is needed.
- **Check-in:** the owner marks "I showed up" on a past planned session; a simple
  reliability figure (kept / total past sessions) is derived from that.
- **Recurring:** a member publishes a weekly day pattern (e.g. Mon/Wed/Fri +
  optional time). Shown as an informational "Regulars" section — **not** expanded
  into individually RSVP-able instances (that stays out of scope to avoid
  recurrence-instance complexity).
- **Online + cached:** reads use the existing network-first `community_cache`
  fallback; writes (plan, RSVP, check-in, set schedule) are online-only for now.

## Data model (Supabase, online-only)

```
planned_sessions(
  id uuid pk, community_id uuid, user_id uuid,
  scheduled_date date not null, scheduled_time text null,  -- 'HH:MM'
  title text null, checked_in_at timestamptz null,
  created_at timestamptz default now())

session_rsvps(
  planned_session_id uuid, user_id uuid, created_at timestamptz,
  pk(planned_session_id, user_id))

recurring_schedules(
  community_id uuid, user_id uuid,
  weekdays int[] not null,            -- ISO 1=Mon .. 7=Sun
  scheduled_time text null, title text null, updated_at timestamptz,
  pk(community_id, user_id))          -- one schedule per member per community
```

RLS mirrors the rest: members read their community's rows (via
`is_community_member`), and each member writes/deletes only their own.

## RPCs (security definer, membership-guarded)

- `create_planned_session(community_id, date, time, title) -> planned_sessions`
- `checkin_planned_session(id)` — set `checked_in_at = now()` on your own session
- `community_calendar(community_id)` — upcoming sessions (`scheduled_date >=
  current_date`) with owner username, rsvp_count, i_rsvped, is_own, checked_in
- `set_recurring_schedule(community_id, weekdays, time, title)` — upsert your own
- `community_recurring(community_id)` — every member's weekly pattern
- `community_reliability(community_id)` — per member: kept vs total past sessions

Deletes and RSVP add/remove go straight to the tables under RLS (owner-only
delete; member-scoped RSVP insert/delete), like kudos.

## Client

- `repositories/communityCalendar.ts` — typed wrappers; reads via the shared
  `cachedRead` (exported from `repositories/communities.ts`).
- Screens: a Calendar tab in the community home; a "Plan a session" form
  (`app/communities/[id]/plan.tsx`) using `@react-native-community/datetimepicker`;
  a "My weekly schedule" editor (`app/communities/[id]/schedule.tsx`); reliability
  surfaced on the members list.

## Backend deploy

New delta file `supabase/communities_phase3.sql`, run in the Supabase SQL editor
after phase 1 and 2.
