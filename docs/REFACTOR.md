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

## Phase 1 — Collapse the sync layer (highest leverage)

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

_Expected: ~728 → ~180 lines._

---

## Phase 2 — Repository shared helpers & return-type cleanup

Goal: remove per-repository boilerplate and the `Entity | boolean` convention.

1. **Shared query helpers** (new `repositories/_helpers.ts`):
   - `activeOnly(table)` → `isNull(table.deleted_at)` predicate.
   - `syncTouch()` → `{ updated_at: now(), is_synced: 0 }` spread.
   - `softDelete(table, id)` and cascade variants — used by `workouts`,
     `workoutExercises`, `workoutExerciseSets`.
2. **Replace `Promise<Entity | boolean>` + `returnData`.** Prefer either:
   - split functions (`addSet` returns `void`/changes, `addSetReturning` returns the
     row), or
   - typed overloads so the return type follows the `returnData` flag with no
     `typeof === 'boolean'` guards at call sites.
   Update callers in `useWorkoutLogic` accordingly.
3. **Split `statistics.tsx` (756 lines)** into cohesive modules (e.g. `volume`,
   `streak`, `personalRecords`) under `repositories/statistics/`.

_Do this incrementally, one repository at a time, tests green between each._

---

## Phase 3 — Decompose `useWorkoutLogic`

Goal: separate business logic from UI side-effects.

Split the 410-line hook into focused pieces:
- `useWorkoutData` — load/refresh workout + exercises + max weights.
- `useSetMutations` — add/update/delete/reorder sets, debounce timers.
- `usePrDetection` — PR check + achievement unlock (returns events, not toasts).

Move UI side-effects (`Toast.show`, `Alert.alert`, `router.push`) out of the logic
layer — have hooks return events/results and let screens render the toasts/alerts.
This makes the PR/achievement logic unit-testable without a UI.

---

## Phase 4 — Conventions & polish

1. **Rename logic `.tsx` → `.ts`** for files with no JSX: all `repositories/*`,
   `db/client|schema|sync|cleanup`, `utils/id`, and non-JSX hooks. Update imports
   (path aliases via `@/` make this low-risk; do it with `git mv`).
2. **Add a `utils/logger.ts`** with levels; replace the 157 `console.*` calls so
   production logging can be silenced/scoped. Sync errors already go through
   `recordSyncError` — keep that.
3. **Delete dead commented code** (`profile.tsx` 52–98, 217–259, and similar).
4. **Tighten `any`** (~10 sites: `Record<string, any>`, `err: any`).

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
> `db/schema.tsx`), **not** by replaying migrations — see the migration bug below.
> Keep `schema.sql` in sync with `db/schema.tsx` on schema changes.

> 🐞 **Migration bug found (needs its own fix):** the migration chain is **not
> clean-installable**. `0000` creates `exercise_body_parts` without
> `created_at/updated_at/deleted_at/is_synced`, but `0002` rebuilds that table with
> `INSERT ... SELECT created_at, ... FROM exercise_body_parts` — columns that don't
> exist yet. A fresh install crashes at migration `0002` (`no such column:
> created_at`). Existing installs survive because they were migrated incrementally.
> Also: `0005` re-runs `0004`'s `completed_at` backfill (harmless duplicate).

### Phase 5b — remaining

3. **Sync round-trip** — push maps → remote columns; pull cleans nested joins;
   cascade-delete of orphaned `workout_exercises` / sets. Anchors Phase 1
   (needs a mocked/faked Supabase client).
4. Broaden soft-delete invariants across the other repositories.

---

## Suggested execution order

```
Phase 0  → hygiene + baseline              ✅ DONE
Phase 5a → harness + PR/statistics tests   ✅ DONE (regression anchor)
Phase 5b → sync round-trip tests           (before Phase 1)
Phase 1  → sync layer collapse             (guarded by 5b sync tests)
Phase 2  → repository helpers + return types
Phase 3  → hook decomposition              (guarded by 5a PR tests)
Phase 4  → conventions, logger, dead code, any + migration-chain fix
```

Each phase = its own branch + PR, conventional-commit messages, lint + tests green
before merge. No behavioral change is intended anywhere in this plan; any behavior
change should be called out explicitly in its PR.
