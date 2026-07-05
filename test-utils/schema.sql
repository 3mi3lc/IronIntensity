-- Test-fixture schema for the in-memory SQLite harness.
--
-- Mirrors db/schema.tsx (the documented source of truth) at its CURRENT state,
-- rather than replaying drizzle/*.sql migrations — the migration chain is not
-- clean-installable (0002 SELECTs columns that 0000 never created). Keep this in
-- sync with db/schema.tsx when the schema changes.

CREATE TABLE `users` (
    `id` text PRIMARY KEY NOT NULL,
    `email` text NOT NULL,
    `username` text NOT NULL
);

CREATE TABLE `exercises` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL REFERENCES `users`(`id`),
    `name` text NOT NULL,
    `description` text,
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0
);

CREATE TABLE `workouts` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL REFERENCES `users`(`id`),
    `name` text NOT NULL,
    `completed_at` text,
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0
);

CREATE TABLE `workout_exercises` (
    `id` text PRIMARY KEY NOT NULL,
    `workout_id` text NOT NULL REFERENCES `workouts`(`id`),
    `exercise_id` text NOT NULL REFERENCES `exercises`(`id`),
    `order_index` integer NOT NULL,
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0
);

CREATE TABLE `workout_exercise_sets` (
    `id` text PRIMARY KEY NOT NULL,
    `workout_exercise_id` text NOT NULL REFERENCES `workout_exercises`(`id`),
    `set_number` integer NOT NULL,
    `reps` integer NOT NULL,
    `is_pr` integer NOT NULL DEFAULT 0,
    `weight` real,
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0
);

CREATE TABLE `body_parts` (
    `id` text PRIMARY KEY NOT NULL,
    `name` text NOT NULL
);

CREATE TABLE `exercise_body_parts` (
    `exercise_id` text NOT NULL REFERENCES `exercises`(`id`),
    `body_part_id` text NOT NULL REFERENCES `body_parts`(`id`),
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0,
    PRIMARY KEY (`exercise_id`, `body_part_id`)
);

CREATE TABLE `sync_metadata` (
    `key` text PRIMARY KEY NOT NULL,
    `last_sync` text NOT NULL,
    `sync_count` integer NOT NULL DEFAULT 0,
    `last_error` text,
    `status` text NOT NULL DEFAULT 'success'
);

CREATE TABLE `body_weight_entries` (
    `id` text PRIMARY KEY NOT NULL,
    `user_id` text NOT NULL REFERENCES `users`(`id`),
    `weight` real NOT NULL,
    `recorded_at` text NOT NULL,
    `notes` text,
    `created_at` text NOT NULL DEFAULT (datetime('now')),
    `updated_at` text NOT NULL DEFAULT (datetime('now')),
    `deleted_at` text,
    `is_synced` integer NOT NULL DEFAULT 0
);

-- Seed body parts (mirrors migration 0001).
INSERT INTO body_parts (id, name) VALUES
    ('shoulders', 'Shoulders'), ('biceps', 'Biceps'), ('triceps', 'Triceps'),
    ('quads', 'Quadriceps'), ('hamstrings', 'Hamstrings'), ('calves', 'Calves'),
    ('adductors', 'Adductors'), ('abductors', 'Abductors'), ('forearms', 'Forearms'),
    ('obliques', 'Obliques'), ('glutes', 'Glutes'), ('traps', 'Trapezius'),
    ('chest', 'Chest'), ('back', 'Back'), ('abs', 'Abs'), ('neck', 'Neck');
