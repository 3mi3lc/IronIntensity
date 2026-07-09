# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install dependencies
npm install

# Start Expo dev server
npm start

# Run on specific platform
npm run android
npm run ios

# Run tests (watch mode)
npm test

# Run a specific test file
npm test -- __tests__/workoutRepository.test.tsx

# Lint
npm run lint

# Generate a new DB migration after schema changes
npx drizzle-kit generate
```

Migrations are applied automatically via `useMigrations()` in `app/_layout.tsx` on app startup. After generating a new migration, add it to `drizzle/migrations.js`.

## Architecture

IronIntensity is an offline-first React Native (Expo) fitness tracker. All data is written to a local SQLite database via Drizzle ORM; a custom `SyncService` (`db/sync.tsx`) handles bidirectional sync with a Supabase backend.

### Layer Stack

```
UI (app/, components/)          ← Expo Router screens + NativeWind styling
Hooks (hooks/)                  ← Business logic (useWorkoutLogic, useSync, etc.)
Contexts (contexts/)            ← AuthContext (Supabase session), UserContext (local user + offline state)
Repositories (repositories/)   ← All DB queries — never query Drizzle from UI directly
SyncService (db/sync.tsx)       ← Push unsynced local changes → Supabase; pull remote → local
Drizzle ORM (db/client.tsx)     ← Opens SQLite database: local_test.db
```

### Key Files

- `db/schema.tsx` — Single source of truth for all table definitions. Types are inferred from here with `$inferSelect` / `$inferInsert`.
- `db/sync.tsx` — `SyncService` class. `fullSync()` calls all push/pull methods in sequence. Each push method fetches records where `is_synced = 0`, upserts to Supabase, then marks them synced locally.
- `app/_layout.tsx` — App root. Sets up providers (SafeArea, GestureHandler, SQLite, Auth, User), runs migrations, and handles auth-based route redirects.
- `contexts/AuthContext.tsx` — Wraps `supabase.auth.onAuthStateChange`; provides `session` and `supabaseUser`.
- `contexts/UserContext.tsx` — On auth, calls `createOrUpdateUser()` to mirror the Supabase user into local SQLite. Also tracks `isOffline` via NetInfo.
- `hooks/useWorkoutLogic.tsx` — All workout editing state: loading exercises/sets, add/delete/reorder, soft-delete, sync flagging (~400 lines).
- `utils/supabase.ts` — Supabase client; persists session to AsyncStorage, handles token auto-refresh on app foreground.

### Navigation

File-based routing via Expo Router:
- `app/(tabs)/` — Bottom tab screens: `logging`, `statistics`, `profile`
- `app/workout/` — Create / edit / view workout stacks
- `app/exercise/` — Create exercise stack
- `app/auth/login.tsx` — Auth screen (redirected to from `_layout.tsx` when no session)

## Development Conventions

- **Offline-first**: Write all data operations against local SQLite. Never write directly to Supabase from UI—let `SyncService` handle it.
- **Repository pattern**: All Drizzle queries live in `repositories/`. UI and hooks call repository functions, not Drizzle directly.
- **Soft deletes**: Records are never hard-deleted. Set `deleted_at = now()` and mark `is_synced = 0`. All queries must filter with `isNull(table.deleted_at)`.
- **Sync flag**: When mutating a record locally, always set `is_synced = 0` so `SyncService` picks it up on next sync.
- **Styling**: NativeWind (Tailwind) classes only. Custom color tokens are defined in `tailwind.config.js` (e.g., `primary_a0` = red accent, `surface_a0` = dark background).
- **Commits**: Follow conventional commits (`feat:`, `fix:`, `docs:`, `chore:`).

## Environment

Requires a `.env.local` at the project root:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-supabase-url.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
