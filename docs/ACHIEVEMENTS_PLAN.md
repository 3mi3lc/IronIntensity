# Achievements Expansion — Plan

_Status: proposed · Date: 2026-07-05_

Turn the achievements board into a motivating, persistent feature: progress bars
on every badge, a non-empty start, new PR + bodyweight badges, its own screen, and
a compact summary on the profile tab.

**Decisions locked (from Q&A):**
- Layout: **profile summary + dedicated full screen**
- State: **persisted** to a new synced table (unlock is permanent — badges never
  re-lock if a stat later drops)
- Progress: **a progress bar on every locked badge** (`8/10 → next badge`)
- New badge types: **Personal Records set** + **Bodyweight tracking** (not variety)

---

## ⚠️ Action needed from you (Supabase)

Persistence syncs to Supabase, so the backend needs a matching table. I'll produce
the exact SQL; **you run it in the Supabase SQL editor** before achievement sync
will succeed. Until then, local unlocks work fine and the sync for this one entity
just records a non-fatal error in `sync_metadata` (everything else keeps syncing).

---

## Phase A — Data model & sync

1. **Schema** (`db/schema.ts`): new `user_achievements` table.
   ```
   user_achievements(
     user_id       -> users.id,
     achievement_id text,        -- matches ACHIEVEMENTS[].id in code
     unlocked_at    text,
     created_at, updated_at, deleted_at, is_synced,
     PRIMARY KEY (user_id, achievement_id)
   )
   ```
   Achievement *definitions* stay in code (the `ACHIEVEMENTS` array); the table only
   records unlock events. Progress is never stored — it's derived from live stats.
2. **Migration `0008`**: `CREATE TABLE` + journal entry + snapshot + register in
   `drizzle/migrations.js`. The existing `__tests__/migrations.test.ts` will replay
   and verify it (clean-install safe, per the recent migration fix).
3. **Supabase SQL** (you run it): the matching Postgres table + RLS policy.
4. **Repository** `repositories/userAchievements.ts`:
   `unlockAchievements(userId, ids[])`, `getUnlockedIds(userId)`, plus the sync
   trio (`getUnsynced…`, `mark…AsSynced`, `upsert…FromRemote`) — same shape as the
   other repos.
5. **Sync** (`db/sync.ts`): add one push + one pull descriptor (trivial now that the
   sync layer is descriptor-driven).

## Phase B — Achievement logic (`repositories/achievements.ts`)

1. **Extend `ACHIEVEMENTS`** (14 new badges, all em-dash-free copy):
   - Seed `milestone`: `welcome` "Welcome Aboard" / "Created your account" / 🎉 /
     threshold 0 (always met, so the board never reads 0%).
   - **PR badges** (`category: 'pr'`, metric = count of `is_pr = 1` sets), 7 tiers:
     `pr_1` First PR (1), `pr_5` Getting Stronger (5), `pr_10` Record Breaker (10),
     `pr_25` PR Machine (25), `pr_50` Peak Performer (50), `pr_100` Record Hunter
     (100), `pr_200` Limitless (200).
   - **Bodyweight badges** (`category: 'bodyweight'`, metric = count of
     `body_weight_entries`), 6 tiers: `bw_1` Step on the Scale (1), `bw_5` Checking
     In (5), `bw_10` Tracking Progress (10), `bw_25` Data Driven (25), `bw_50`
     Consistency Counts (50), `bw_100` Scale Master (100).
2. **Extend the metric queries**: add PR-count and bodyweight-count alongside the
   existing volume/workouts/streak.
3. **Richer return type**: each achievement now returns
   `{ ...def, unlocked, progress, target }` (`progress` = current metric value) so
   the UI can draw a bar and `progress/target` label.
4. **Persisted unlock** replaces the current stateless diff:
   `syncUnlockedAchievements(userId)` evaluates all badges vs current stats, inserts
   any newly-met ids into `user_achievements`, and returns the newly-unlocked list
   for toasts. `unlocked = id ∈ persisted set` (so a dropped streak keeps its badge).
   Runs on **workout finish** (keeps the toast flow) and once when the **achievements
   screen loads** (to "catch up" silently).

## Phase C — UI

1. `components/achievementRow.tsx` — badge row: icon, title, description, a progress
   bar with `current/target`, ✓ when unlocked, dimmed when locked. NativeWind +
   existing `primary_a*/surface_a*` tokens.
2. `app/achievements.tsx` — new route: full board grouped by category, header with
   overall unlocked count + a top progress ring/bar.
3. `app/(tabs)/profile.tsx` — replace the inline full board with a compact summary
   card (`N/M unlocked` + the single nearest badge's progress) + a **"View all →"**
   row that routes to `/achievements`.
4. Wire navigation (`router.push('/achievements')`).

## Phase D — Tests (safety net first, as with statistics)

`achievements.ts` is currently untested. Add `__tests__/achievements.test.ts`:
- progress value + threshold unlock per category (volume/workouts/streak/pr/bodyweight)
- the `welcome` seed is always unlocked
- **persistence**: an unlocked badge stays unlocked after the metric drops
- `syncUnlockedAchievements` returns only *newly* unlocked ids and writes them once
- `migrations.test.ts` gains the `user_achievements` table assertion

---

## Suggested order & verification

```
A (schema + migration + repo + sync)   → migrations.test + sync tests green
B (logic + new badges + progress)      → new achievements.test green
C (screen + profile summary + nav)     → YOU verify in-app (no UI tests)
Supabase SQL                           → YOU run; then verify a real sync round-trip
```

Each phase is its own branch/commit, tests green before merge. Phase C needs your
in-app verification (like the Phase 3 hook work). No behavior regresses elsewhere.

## Assumptions I'll proceed on unless you say otherwise
- Seed badge = "Welcome Aboard" (always unlocked); no em dashes in any badge copy.
- PR thresholds 1/5/10/25/50/100/200; bodyweight 1/5/10/25/50/100.
- PR metric counts `is_pr = 1` sets (non-deleted, completed workouts) — this is
  dynamic (PRs can recalc), but once a PR badge is unlocked it stays unlocked.
- Profile keeps the sync + logout buttons; only the achievements section changes.
