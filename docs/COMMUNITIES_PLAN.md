# Communities & Social Layer: Plan

_Status: proposed · Date: 2026-07-09_

Add a social layer built around **communities** (a gym or a group of friends who
train together). Each community has leaderboards, an activity feed with kudos, and
later a shared training calendar. The goal is competitive motivation without a
heavy multiplayer backend, starting with the smallest slice that creates a real
social hook.

**Decisions locked (from Q&A):**
- First audience: **friend groups first** (private, invite-code). No public
  discovery, gyms, or moderation in the first release.
- Numbers visibility: **never display another member's bodyweight or raw
  set-by-set weights.** Only summaries and derived scores are shown.
- Leaderboard philosophy: **lead with consistency and most-improved**, not raw
  strength. Different members can win different boards.
- Kudos target: **any feed event can receive kudos** (PRs and milestones just get
  a louder card).
- Feed contents: **both per-completed-workout cards and notable events** (PRs,
  streaks, badge unlocks) appear in the feed.

---

## Architectural note (read first)

This is the biggest addition the app has had, because it breaks the pure
offline-first model. Leaderboards, feeds, and kudos are "server-of-record"
objects that only make sense online: a community leaderboard cannot be computed
on a single device.

The split:
- **Personal workout data stays offline-first**, exactly as today. Nothing about
  the local SQLite + SyncService flow changes.
- **The social layer is a new, online-only surface** on Supabase, gated by
  row-level security (RLS) via community membership. The offline sync flags
  (`is_synced`, `deleted_at`) do not drive access here; RLS does.
- **Degrade gracefully offline:** show the last-synced leaderboard and feed from
  cache; queue kudos to send on reconnect.

---

## The privacy boundary (the important rule)

The device already holds full workout detail locally. The question is what
*leaves* the device and what is *shown* to other members.

- **Push summaries, never raw sets.** A feed event carries something like
  `{ session_count_delta, total_volume, top_lift_label }`, not the weight-by-weight
  breakdown.
- **One carve-out: PRs.** A personal-record card does show its absolute weight
  (`Bench Press, 100kg x 5`), because a PR is an earned highlight the member wants
  seen. Ordinary set weights and bodyweight stay hidden. In Phase 2 the PR card
  can also show a relative-strength score derived from the private bodyweight
  input.
- **Bodyweight is a private, server-side computation input, never a displayed
  value.** Phase 1 does not need it at all. In Phase 2, relative-strength boards
  need bodyweight to compute a DOTS/Wilks score, so it travels to the server into
  a row only that member (and the server function) can read. Only the derived
  score (`dots_score: 342`) is ever returned to other members. The number is
  used, never shown.
- **Share levels (later):** full numbers / relative-only / "completed a workout"
  with no weights, chosen per community.

---

## Phase 1: prove the loop

Private invite-code communities → member list → two weekly leaderboards
(consistency, most-improved) → activity feed with kudos. Nothing else.

### Data model (new, online-only on Supabase)

Access is gated by membership through RLS. These are not offline-first tables.

- **communities** : id, name, invite_code (short, regenerable), created_by,
  created_at
- **community_members** : community_id, user_id, role (`admin` | `member`),
  joined_at
- **feed_events** : id, community_id, actor_user_id, type
  (`workout_completed` | `pr` | `streak_milestone`), payload (jsonb summary, no
  raw sets), created_at
- **kudos** : id, feed_event_id, user_id, reaction, created_at; unique on
  (feed_event_id, user_id, reaction) so a member cannot double-tap the same
  reaction

Leaderboards are **not a table.** They are an aggregate computed from
`feed_events` plus each member's own workout summaries, cached server-side.

### Leaderboard computation

- **Weekly consistency:** count of completed sessions per member since Monday.
  The board a beginner can win.
- **Weekly most-improved:** percent change in a member's total volume (or
  estimated 1RM) versus their own prior 4-week baseline. This compares each
  member against their own past self, so it reuses the "compete with past self"
  idea and never exposes absolute numbers.
- Compute in a Supabase edge function or scheduled job and cache the result,
  rather than pulling every member's events to each device. Offline shows the
  last cached board.

### Screens

1. **Communities list** : groups I am in, plus "Create" and "Join with code."
2. **Create / Join** : name + generated invite code, or paste a code to join.
3. **Community home** : tabs for **Leaderboard** (consistency | most-improved
   toggle, weekly) and **Feed** (event cards with kudos taps). Member count and
   invite button in the header.
4. **Member list** : names, admin badge, leave-community action.

### Synergy with existing achievements

The app already ships 75 achievements and a `rewardEngine`. Those badges are
currently private. Surfacing badge unlocks in the community feed is what makes
them matter to other people. Adding a `badge_unlocked` feed event type is a small
Phase 1 or early Phase 2 win that pays off the achievement work already done.

---

## Later phases

- **Phase 2 (richer competition):** relative strength via DOTS/Wilks (bodyweight
  as private server input, score-only output), per-exercise boards, raw-volume
  board, monthly and all-time timeframes, badge unlocks in the feed.
- **Phase 3 (calendar):** planned training sessions others can see, RSVP / "I'm
  in", recurring schedules, optional check-in feeding a reliability stat.
  **Safety gate:** a visible schedule broadcasts physical location and time. It
  must be strictly opt-in per community and easy to switch off. This is why the
  calendar is sequenced after the feed, not first.
- **Phase 4 (gym scale):** public/discoverable communities, QR-code join at the
  gym, verified gyms, and moderation tooling (report, remove, block).

---

## Action needed from you (Supabase)

Like the achievements work, the social tables live in Supabase and need RLS
policies so members only read their own community's data. The exact table +
policy + function SQL is written up in the companion technical spec:
[COMMUNITIES_PHASE1_SPEC.md](./COMMUNITIES_PHASE1_SPEC.md). You run it in the
Supabase SQL editor before Phase 1 sync will succeed.
