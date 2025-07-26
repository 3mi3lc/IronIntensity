import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

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
    created_at: text('created_at').default("datetime('now')"),
    updated_at: text('updated_at').default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').default(0),
});

// Workouts Table
export const workouts = sqliteTable('workouts', {
    id: text('id').primaryKey().notNull(),
    user_id: text('user_id')
        .notNull()
        .references(() => users.id),
    name: text('name').notNull(),
    created_at: text('created_at').default("datetime('now')"),
    updated_at: text('updated_at').default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').default(0),
});

// Workout_Exercises Table
export const workout_exercises = sqliteTable('workout_exercises', {
    id: text('id').primaryKey().notNull(),
    workout_id: text('workout_id')
        .references(() => workouts.id),
    exercise_id: text('exercise_id')
        .references(() => exercises.id),
    order_index: integer('order_index'),
    created_at: text('created_at').default("datetime('now')"),
    updated_at: text('updated_at').default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').default(0),
});

// Workout_Exercise_Sets Table
export const workout_exercise_sets = sqliteTable('workout_exercise_sets', {
    id: text('id').primaryKey().notNull(),
    workout_exercise_id: text('workout_exercise_id')
        .references(() => workout_exercises.id),
    set_number: integer('set_number').notNull(),
    reps: integer('reps').notNull(),
    weight: real('weight'),
    created_at: text('created_at').default("datetime('now')"),
    updated_at: text('updated_at').default("datetime('now')"),
    deleted_at: text('deleted_at'),
    is_synced: integer('is_synced').default(0),
});
