# IronIntensity — Refactoring & Restructuring Plan

_Status: proposed · Author: refactor planning pass · Date: 2026-07-05_

This document is a phased plan to reduce duplication, improve maintainability, and
add a safety net of tests — **without changing app behavior**. Each phase is
independently shippable and ordered so that low-risk cleanup lands first and
structural changes build on a green test baseline.

The intended architecture (UI → hooks → repositories → SyncService → Drizzle) is
sound and stays. The problems are almost entirely *inside* layers: repeated
boilerplate, an awkward return-type convention, and one over-stuffed hook.

---

## Findings summary

| Area | File(s) | Issue |
|---|---|---|
| Sync layer | `db/sync.tsx` (728 lines) | 7 push + 7 pull methods are near-identical boilerplate; per-table column maps hand-written. |
| Repositories | `repositories/*` (2,781 lines) | `statistics.tsx` (756), `workoutExerciseSets.tsx` (571), `workouts.tsx` (446). Soft-delete / `is_synced=0` / `now()` / `isNull(deleted_at)` repeated with no shared helpers. |
| Return convention | most repositories | `Promise<Entity \| boolean>` + `returnData` flag forces `typeof x === 'boolean'` guards at call sites. |
| Over-stuffed hook | `hooks/useWorkoutLogic.tsx` (410 lines) | Data loading + PR detection + toasts + achievements + navigation + debounce timers in one hook. |
| File extensions | repositories, `utils/id.tsx`, `db/*.tsx`, logic hooks | Pure-logic (no JSX) files use `.tsx`; should be `.ts`. |
| Logging | everywhere | 157 `console.*` calls; no centralized/leveled logger. |
| Dead code | `app/(tabs)/profile.tsx` (52–98, 217–259) and others | Large commented-out blocks. |
| Tests | `__tests__/` | Only 1 test file; PR + statistics logic untested. |
| Git hygiene | repo root | `.idea/` and `supabase/.temp/` tracked; `android/`, `package-lock.json`, 12 new components/hooks, 5 migrations untracked; duplicate commit messages. |

Highest-leverage single target: **`db/sync.tsx`** — ~700 lines that a table-descriptor
pattern can reduce to ~150 + config.

---

## Phase 0 — Baseline & git hygiene (low risk, do first)

Goal: a clean, green starting point so later diffs are reviewable.

1. **Commit outstanding work.** The tree has 12 untracked components/hooks
   (`components/exerciseList.tsx`, `metricChart.tsx`, `recentPRsList.tsx`,
   `timeRangeSelector.tsx`, `hooks/useStatistics.tsx`) and 5 untracked migrations
   (`drizzle/0002…0007`). Land these first — refactoring on top of uncommitted
   work is risky.
2. **Fix `.gitignore` and untrack generated dirs:**
   - Add `android/`, `ios/` (Expo prebuild output — confirmed standard, default
     package `com.emcor.ironintensity`), `.idea/`, and `supabase/.temp/`.
   - `git rm -r --cached .idea supabase/.temp` to stop tracking them.
   - _Note:_ if native modules are ever hand-edited, revisit and commit `android/`
     deliberately. For now it's regenerable via `expo prebuild`.
3. **Verify `package-lock.json`** is intended, then commit it (reproducible installs).
4. **Establish the baseline:** run `npm run lint` and `npm test`, record actual state.

### Baseline reality (discovered during Phase 0 execution, 2026-07-05)

The plan assumed a green baseline; it was not green. Findings:

- **ESLint was never configured.** The first `expo lint` run auto-installed
  `eslint` + `eslint-config-expo` and generated `eslint.config.js` (committed in
  Phase 0). Lint now runs and reports **5 errors + 12 warnings** — mostly
  `react/no-unescaped-entities` (trivial), but note one real bug:
  `components/workoutScreen.tsx:86` calls `useCallback` **conditionally**
  (`react-hooks/rules-of-hooks`). → fix in **Phase 4**.
- **Tests could not even load:** `utils/id.tsx` imports `expo-crypto` (ESM), which
  Jest's `transformIgnorePatterns` (only whitelists `uuid`) can't transform. Fixed
  in Phase 0 by adding `__mocks__/expo-crypto.tsx` (mirrors the existing
  `expo-sqlite` manual mock).
- **The sole test file is stale.** With loading fixed, all 6 tests in
  `__tests__/workoutRepository.test.tsx` fail: the Drizzle mock models a 2-level
  `select().from()` chain, but the current repositories chain
  `select().from().where()...`. These assertions predate current repo code.
  Repairing + expanding this suite is folded into **Phase 5** — there is currently
  **no working regression anchor**, which raises the risk on Phases 1–3 and makes
  Phase 5 a hard prerequisite rather than a parallel track.

_Exit criteria (revised):_ clean `git status`, generated dirs ignored, lint
configured & running, test infra loads (assertion repair deferred to Phase 5).

---

## Phase 1 — Collapse the sync layer (highest leverage) — ✅ DONE (2026-07-05)

**Result: `db/sync.tsx` 728 → 402 lines (−45%).** The 14 copy-paste push/pull
methods now delegate to two generic engines — `pushTable(cfg)` / `pullTable(cfg)` —
with a thin per-table config each. Error handling, empty-checks, cascade re-fetch,
and last-sync bookkeeping live once. The public API (all `push*`/`pull*` methods,
`pushAll`, `pullAll`, `pullBodyParts`) is unchanged, so `useSync`/`useAutoSync`
needed no edits. Guarded by the Phase 5b sync tests — all green after the rewrite.
`pushUser` kept bespoke (single-record, different shape). The remaining length is
the explicit remote column projections, which are the sync contract and are
deliberately not abstracted away.

Design notes (as-built) below.

Goal: turn `db/sync.tsx` from 14 copy-paste methods into a descriptor-driven engine.

Every `pushX` does: fetch `is_synced=0` rows → map to remote columns → `supabase.upsert`
→ `markXAsSynced` → `recordSyncError` on failure. Every `pullX` does: `getLastSyncTime`
→ build filtered query → `upsertXFromRemote` → `setLastSyncTime`.

**Approach — a `SyncableTable` descriptor per entity:**

```ts
interface SyncableTable<T> {
  key: string;                          // sync_metadata key + table name
  getUnsynced: () => Promise<T[]>;
  toRemote: (row: T) => Record<string, unknown>;
  markSynced: (rows: T[]) => Promise<void>;
  upsertLocal: (rows: any[]) => Promise<boolean>;
  onConflict?: string;                  // e.g. 'exercise_id,body_part_id'
  cascade?: { parentIdOf: (row: T) => string | null; ... }; // for we/sets
  pullFilter?: (q) => q;                // e.g. user scoping, completed_at not null
}
```

Then generic `pushTable(desc)` / `pullTable(desc, userId)` replace the 14 methods.
`pushAll` / `pullAll` become ordered arrays of descriptors instead of repetitive
sequential blocks. The two cascade-delete special cases (`pushWorkoutExercises`,
`pushSets`) are expressed via the optional `cascade` field.

**Risks & mitigations:**
- Sync correctness is critical and offline-first → land Phase 5 sync tests *before*
  or alongside this. Snapshot the current push/pull column sets exactly.
- Keep the public `SyncService` surface (`fullSync`, `pushAll`, `pullAll`) unchanged
  so `hooks/useSync` / `useAutoSync` need no edits.

_Expected ~180; actual 402 — the column projections are irreducible contract._

---

## Phase 2 — Repository shared helpers & return-type cleanup

Goal: remove per-repository boilerplate and the `Entity | boolean` convention.

### Part A — shared mutation helpers — ✅ DONE (2026-07-05)

Added `repositories/_helpers.ts` with `touch(ts?)` → `{ updated_at, is_synced: 0 }`
and `softDeleteFields(ts?)` → `{ deleted_at, updated_at, is_synced: 0 }`, both
accepting an optional shared timestamp so multi-statement operations keep an
identical `updated_at`. Applied across `workouts`, `workoutExercises`,
`workoutExerciseSets`, `exercises`, and `bodyWeightEntries` (~15 sites). This
centralizes the offline-first "reset `is_synced` on every mutation" convention
that was previously hand-repeated. All 32 tests green; no behavior change.

Left intentionally bespoke: `markWorkoutExerciseAsDeleted` /
`markWorkoutExerciseSetAsDeleted` set only `deleted_at` (internal sync-cascade
helpers, not user mutations); inserts keep explicit `created_at`.

_Not done: an `activeOnly`/`isNull(deleted_at)` predicate wrapper — judged too
thin to be worth the indirection over the already-clear `isNull(t.deleted_at)`._

### Part B — return-type cleanup — DEFERRED

Replacing `Promise<Entity | boolean>` + `returnData` changes call sites across UI
screens and hooks (every `typeof x === 'boolean'` guard). We only have
repository- and sync-level tests — no UI/hook tests — so doing this blind risks
silent breakage. **Deferred until Phase 3** (hook decomposition), where the
affected `useWorkoutLogic` callers are being rewritten anyway and can adopt the
new signatures in the same guarded pass.

### Part C — de-duplicate `statistics.ts` — ✅ DONE (2026-07-05)

Chose **de-duplication over a file split** (the split was pure cosmetics). Added
three internal helpers and applied them across the 21 functions:
- `workoutInRange(userId, start, end)` — the "completed, non-deleted workout in a
  date range" filter, previously copy-pasted in **14** places, now defined once.
- `volumeSum()` — the `COALESCE(SUM(weight*reps), 0)` expression (was repeated 6×).
- `accumulate(points, key)` — collapsed the **6** near-identical cumulative wrappers
  into one-liners.

756 → 674 lines. The fluent `sets→exercises→workouts` join chain (9×) was left
alone — abstracting drizzle's builder hurts readability more than it helps.

De-risked by first adding **5 characterization tests** (`getVolumeByDay`,
`getWorkoutsByDay`, `getCumulativeVolumeByDay`, `getTopExercisesByVolume`,
`getRecentPRs`) that passed against the original code, then stayed green through
the refactor. Suite: 41 tests.

---

## Phase 3 — Decompose `useWorkoutLogic` — ✅ DONE (2026-07-05)

**Result: `useWorkoutLogic` 413 → ~100 lines (a composition facade).** Split into
four focused hooks, with the public API and behavior **unchanged** — the four
consumer screens (`create`/`edit`/`performAgain`/`view`) were not touched:

- `useWorkoutData(workoutId)` — load/refresh workout + exercises + max weights +
  lazily-loaded historical sets; owns `exerciseData`/`setExerciseData`.
- `useSetMutations(...)` — add/delete/update-with-debounce sets + PR toast.
- `useWorkoutActions(...)` — delete/reorder exercises, finish (with achievement +
  PR side-effects), delete, navigation, and the edit-form state (name/date).
- `useExerciseHistoryPanel()` — self-contained history-panel UI state.

**Chosen scope: internal split behind an identical API** (per pairing decision) —
lowest risk, no screen changes. Also cleaned the last `err: any` in the data
loader and dropped an unused `prevLongest`.

**Deliberately NOT done:** relocating `Toast`/`Alert`/`router` out of the hooks
into screens. For this RN app that's architectural purity at the cost of more UI
wiring; calling them from hooks is idiomatic and pragmatic. The PR/achievement
*calculation* is already unit-tested at the repository layer.

Static checks green (0 tsc errors, 36 tests, lint unchanged); **runtime behavior
to be verified in-app** (no UI test harness).

---

## Phase 4 — Conventions & polish

### Quick wins — ✅ DONE (2026-07-05)

- **All 5 lint errors fixed** → lint now reports 0 errors (8 warnings remain:
  mostly intentional `react-hooks/exhaustive-deps`).
  - **Real bug:** `components/workoutScreen.tsx` called `useCallback` *after* an
    early `return` (rules-of-hooks) — the exercise-history early return now runs
    after the hook, keeping hook order stable across renders.
  - `react/no-unescaped-entities` in `deleteWorkoutModal`, `workoutOptionsModal`,
    `exerciseHistoryScreen` escaped.
- **Dead code removed:** `profile.tsx` commented `handlePull` /
  `handleRecalculatePRs` blocks and their commented buttons, plus the now-unused
  `recalculateAllPRs` import, `pullData` binding, and unused `View` import in
  `workoutListItem.tsx`.

### Remaining Phase 4 work

2. **Logger — ✅ DONE (2026-07-05).** Added `utils/logger.ts` (`debug`/`info`
   dev-only via `__DEV__`, muted under Jest; `warn`/`error` always surface).
   Migrated **every** raw `console.*` in `db/`, `repositories/`, `contexts/`,
   `hooks/`, `app/`, and `components/` to it — 0 remain outside `logger.ts`.
5. **Asset typecheck gap — ✅ DONE.** Added `global.d.ts` with `declare module
   '*.png'` (+ jpg/jpeg/svg/ttf). **Project now type-checks with 0 `tsc` errors.**
3. **Tighten `any` — ✅ PARTIAL.** Tightened the pure-type sites with no runtime
   change (`useStreak` trigger → `unknown`, `useWorkoutLogic` updates →
   `Record<string, string>`, `workoutScreen` `onEditSet` updates typed). Left the
   justified/pragmatic ones (Supabase query-builder interop in `db/sync.tsx`,
   icon-name casts, `catch (e: any)` blocks).

1. **Rename logic `.tsx` → `.ts` — ✅ DONE (2026-07-05).** Renamed 26 no-JSX files
   across `db/`, `repositories/`, `utils/`, `hooks/` via `git mv` (content
   unchanged). Verified no explicit-extension imports first; also fixed
   `drizzle.config.ts` which hard-coded `./db/schema.tsx`. 0 tsc errors, 32 tests
   green. (`contexts/` kept `.tsx` — they render Providers.)

Still open:
4. ~~Fix the migration chain~~ — ✅ **DONE (2026-07-05)**, see the Phase 5a bug note.
7. **Split `statistics.tsx`** (Part C) — deferred. It has ~22 functions (only 3
   test-covered) with cross-dependencies (comparison→totals, cumulative→by-period);
   a physical split is pure code-movement whose only payoff is a smaller file, and
   the transcription risk over mostly-untested code isn't justified without a
   reason to touch it. Best done alongside future work in that area.

---

## Phase 5 — Test coverage (safety net for the above)

Goal: lock behavior before/while refactoring the risky bits.

### Phase 5a — DONE (2026-07-05)

Replaced the call-shape mocks with a **real in-memory SQLite harness**
(`test-utils/db.ts` on `better-sqlite3`), which runs the actual Drizzle schema so
tests exercise genuine query behavior (soft-delete filtering, cascades, PR logic).
Wired into repositories via `jest.mock('@/db/client', () => require('@/test-utils/db'))`.
Fixtures in `test-utils/fixtures.ts`. Run with `npm run test:ci`.

Suites (24 tests, all green):
- `workoutRepository.test.tsx` — CRUD, soft-delete **cascade**, read filtering.
- `personalRecords.test.ts` — `markPRsForWorkout` (baseline vs PR, running best,
  cross-workout history, weight/rep ties, stale-flag reset) + `checkAndMarkSetAsPR`.
- `statistics.test.ts` — `getTotalWorkouts`, `getTotalVolume` (deleted-set exclusion),
  `getWorkoutStreak` (longest run, same-week collapse).

> **Harness note:** the schema is built from `test-utils/schema.sql` (mirrors
> `db/schema.ts`) for speed/determinism, **not** by replaying migrations. Keep
> `schema.sql` in sync with `db/schema.ts` on schema changes;
> `__tests__/migrations.test.ts` separately guards that the real migrations still
> apply cleanly (now that the chain is fixed — see below).

> ✅ **Migration bug — FIXED (2026-07-05).** The chain was **not clean-installable**:
> `0000` created `exercise_body_parts` without
> `created_at/updated_at/deleted_at/is_synced`, but `0002` rebuilt the table with
> `INSERT ... SELECT created_at, ... FROM exercise_body_parts` — columns that didn't
> exist yet — so every fresh install crashed at `0002` (`no such column: created_at`).
> **Fix:** `0002`'s copy now `SELECT`s only `exercise_id, body_part_id`; the new
> columns take their table defaults (the source table is empty at that point on a
> fresh install anyway, and the end schema is unchanged). Chosen over editing `0000`
> because it's localized and needs no snapshot changes. **Safe for existing installs:**
> the drizzle migrator tracks applied migrations by the journal's `when` timestamp,
> not by SQL hash, so a changed migration body is never re-run on installs past it.
> Verified by `__tests__/migrations.test.ts`, which replays the real migrations on a
> fresh in-memory DB. `0005`'s harmless duplicate backfill was left as-is (removing it
> would mean editing the journal for no functional gain).

### Phase 5b — DONE (2026-07-05)

Added `test-utils/fakeSupabase.ts` (records upsert payloads, serves preset select
data) and `__tests__/sync.test.ts` (8 tests). Anchors Phase 1 by pinning:
- **Exact push column projections** (e.g. `pushExercises`, `pushWorkouts` incl.
  `completed_at`) — the contract the descriptor refactor must preserve.
- **Mark-synced only on success**: a failed remote upsert returns `false`, leaves
  `is_synced = 0`, and records a `failed` row in `sync_metadata`.
- **Parent cascades**: `pushSets` / `pushWorkoutExercises` soft-delete children of
  a deleted parent before pushing.
- **Pull path**: remote rows land locally as `is_synced = 1`, last-sync recorded,
  nested join objects tolerated.

### Phase 5c — remaining (optional)

Broaden soft-delete invariants across the other repositories (body weight,
exercise-body-parts) if those areas get refactored.

---

## Suggested execution order

```
Phase 0  → hygiene + baseline              ✅ DONE
Phase 5a → harness + PR/statistics tests   ✅ DONE (regression anchor)
Phase 5b → sync round-trip tests           ✅ DONE
Phase 1  → sync layer collapse             ✅ DONE (728→402 lines)
Phase 2  → repository mutation helpers      ✅ DONE (Part A; B/C deferred)
Phase 3  → hook decomposition + return-type cleanup   ← NEXT

Phase 4  → conventions, logger, dead code, any + migration-chain fix
```

Each phase = its own branch + PR, conventional-commit messages, lint + tests green
before merge. No behavioral change is intended anywhere in this plan; any behavior
change should be called out explicitly in its PR.
