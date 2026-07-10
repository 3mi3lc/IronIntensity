import { sqliteTable, text, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';

// Users Table
export const users = sqliteTable('users', {
    id: text('id').primaryKey().notNull(),
    email: text('email').notNull(),
    username: text('username').notNull(),
});

// Exercises Table
export const exercises = sqliteTable('exercises', {
    id: text('id').primaryKey().notNull(),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id),
    name: text('name').notNull(),
    description: text('description'),
    created_at: text('created_at').notNull().default("datetime('now')"),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').notNull().default(0),
});

// Workouts Table
export const workouts = sqliteTable('workouts', {
    id: text('id').primaryKey().notNull(),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id),
    name: text('name').notNull(),
    completed_at: text('completed_at'),
    created_at: text('created_at').notNull().default("datetime('now')"),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').notNull().default(0),
});

// Workout_Exercises Table
export const workout_exercises = sqliteTable('workout_exercises', {
    id: text('id').primaryKey().notNull(),
    workout_id: text('workout_id')
        .notNull()
        .references(() => workouts.id),
    exercise_id: text('exercise_id')
        .notNull()
        .references(() => exercises.id),
    order_index: integer('order_index').notNull(),
    created_at: text('created_at').notNull().default("datetime('now')"),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').notNull().default(0),
});

// Workout_Exercise_Sets Table
export const workout_exercise_sets = sqliteTable('workout_exercise_sets', {
    id: text('id').primaryKey().notNull(),
    workout_exercise_id: text('workout_exercise_id')
        .notNull()
        .references(() => workout_exercises.id),
    set_number: integer('set_number').notNull(),
    reps: integer('reps').notNull(),
    is_pr: integer('is_pr').notNull().default(0),
    weight: real('weight'),
    created_at: text('created_at').notNull().default("datetime('now')"),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').notNull().default(0),
});

// Body Parts Table
export const body_parts = sqliteTable('body_parts', {
    id: text('id').primaryKey().notNull(),
    name: text('name').notNull(),
});

// Exercise_BodyParts Junction Table (many-to-many)
export const exercise_body_parts = sqliteTable(
    'exercise_body_parts',
    {
        exercise_id: text('exercise_id').notNull().references(() => exercises.id),
        body_part_id: text('body_part_id').notNull().references(() => body_parts.id),
        created_at: text('created_at').notNull().default("datetime('now')"),
        updated_at: text('updated_at').notNull().default("datetime('now')"),
        deleted_at: text('deleted_at'),
        is_synced: integer('is_synced').notNull().default(0),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.exercise_id, table.body_part_id] }),
    })
);

export const sync_metadata = sqliteTable('sync_metadata', {
    key: text('key').primaryKey().notNull(),
    last_sync: text('last_sync').notNull(),
    sync_count: integer('sync_count').notNull().default(0),
    last_error: text('last_error'),
    status: text('status').notNull().default('success'),
});

export const body_weight_entries = sqliteTable('body_weight_entries', {
    id: text('id').primaryKey().notNull(),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id),
    weight: real('weight').notNull(),
    recorded_at: text('recorded_at').notNull(),
    notes: text('notes'),
    created_at: text('created_at').notNull().default("datetime('now')"),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').notNull().default(0),
});

// Pending_Activity Table (local outbox: community feed events awaiting emit).
// Purely local — never pulled back. Each row is a JSON array of { type, payload }
// events for one finished workout, fanned out to the user's communities by the
// emit_activity RPC on next sync, then marked synced.
export const pending_activity = sqliteTable('pending_activity', {
    id: text('id').primaryKey().notNull(),
    payload: text('payload').notNull(),
    created_at: text('created_at').notNull().default("datetime('now')"),
    is_synced: integer('is_synced').notNull().default(0),
});

// Community_Cache Table (local read cache for the online community RPCs, so the
// last-synced boards/feed/members stay viewable offline). Purely local; keyed by
// a cache key (e.g. "my_communities", "feed:<id>", "leaderboard:<id>:<m>:<p>").
export const community_cache = sqliteTable('community_cache', {
    key: text('key').primaryKey().notNull(),
    value: text('value').notNull(),
    updated_at: text('updated_at').notNull().default("datetime('now')"),
});

// Pending_Kudos Table (local outbox for kudos given/removed while offline). One
// row per (event, user) holds the latest intended state; flushed on next sync.
export const pending_kudos = sqliteTable(
    'pending_kudos',
    {
        feed_event_id: text('feed_event_id').notNull(),
        user_id: text('user_id').notNull(),
        action: text('action').notNull(), // 'add' | 'remove'
        updated_at: text('updated_at').notNull().default("datetime('now')"),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.feed_event_id, table.user_id] }),
    })
);

// User_Achievements Table (records unlock events; definitions live in code)
export const user_achievements = sqliteTable(
    'user_achievements',
    {
        user_id: text('user_id')
            .notNull()
            .references(() => users.id),
        achievement_id: text('achievement_id').notNull(),
        unlocked_at: text('unlocked_at').notNull(),
        created_at: text('created_at').notNull().default("datetime('now')"),
        updated_at: text('updated_at').notNull().default("datetime('now')"),
        deleted_at: text('deleted_at'),
        is_synced: integer('is_synced').notNull().default(0),
    },
    (table) => ({
        pk: primaryKey({ columns: [table.user_id, table.achievement_id] }),
    })
);