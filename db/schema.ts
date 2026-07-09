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