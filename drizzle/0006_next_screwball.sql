PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_body_weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weight` real NOT NULL,
	`recorded_at` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_body_weight_entries`("id", "user_id", "weight", "recorded_at", "notes", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "id", "user_id", "weight", "recorded_at", "notes", "created_at", "updated_at", "deleted_at", "is_synced" FROM `body_weight_entries`;--> statement-breakpoint
DROP TABLE `body_weight_entries`;--> statement-breakpoint
ALTER TABLE `__new_body_weight_entries` RENAME TO `body_weight_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_exercise_body_parts` (
	`exercise_id` text NOT NULL,
	`body_part_id` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`exercise_id`, `body_part_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`body_part_id`) REFERENCES `body_parts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exercise_body_parts`("exercise_id", "body_part_id", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "exercise_id", "body_part_id", "created_at", "updated_at", "deleted_at", "is_synced" FROM `exercise_body_parts`;--> statement-breakpoint
DROP TABLE `exercise_body_parts`;--> statement-breakpoint
ALTER TABLE `__new_exercise_body_parts` RENAME TO `exercise_body_parts`;--> statement-breakpoint
CREATE TABLE `__new_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exercises`("id", "user_id", "name", "description", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "id", "user_id", "name", "description", "created_at", "updated_at", "deleted_at", "is_synced" FROM `exercises`;--> statement-breakpoint
DROP TABLE `exercises`;--> statement-breakpoint
ALTER TABLE `__new_exercises` RENAME TO `exercises`;--> statement-breakpoint
CREATE TABLE `__new_sync_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`last_sync` text NOT NULL,
	`sync_count` integer DEFAULT 0 NOT NULL,
	`last_error` text
);
--> statement-breakpoint
INSERT INTO `__new_sync_metadata`("key", "last_sync", "sync_count", "last_error") SELECT "key", "last_sync", "sync_count", "last_error" FROM `sync_metadata`;--> statement-breakpoint
DROP TABLE `sync_metadata`;--> statement-breakpoint
ALTER TABLE `__new_sync_metadata` RENAME TO `sync_metadata`;--> statement-breakpoint
CREATE TABLE `__new_workout_exercise_sets` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_exercise_id` text NOT NULL,
	`set_number` integer NOT NULL,
	`reps` integer NOT NULL,
	`is_pr` integer DEFAULT 0 NOT NULL,
	`weight` real,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workout_exercise_id`) REFERENCES `workout_exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_workout_exercise_sets`("id", "workout_exercise_id", "set_number", "reps", "is_pr", "weight", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "id", "workout_exercise_id", "set_number", "reps", "is_pr", "weight", "created_at", "updated_at", "deleted_at", "is_synced" FROM `workout_exercise_sets`;--> statement-breakpoint
DROP TABLE `workout_exercise_sets`;--> statement-breakpoint
ALTER TABLE `__new_workout_exercise_sets` RENAME TO `workout_exercise_sets`;--> statement-breakpoint
CREATE TABLE `__new_workout_exercises` (
	`id` text PRIMARY KEY NOT NULL,
	`workout_id` text NOT NULL,
	`exercise_id` text NOT NULL,
	`order_index` integer NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`workout_id`) REFERENCES `workouts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_workout_exercises`("id", "workout_id", "exercise_id", "order_index", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "id", "workout_id", "exercise_id", "order_index", "created_at", "updated_at", "deleted_at", "is_synced" FROM `workout_exercises`;--> statement-breakpoint
DROP TABLE `workout_exercises`;--> statement-breakpoint
ALTER TABLE `__new_workout_exercises` RENAME TO `workout_exercises`;--> statement-breakpoint
CREATE TABLE `__new_workouts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_workouts`("id", "user_id", "name", "completed_at", "created_at", "updated_at", "deleted_at", "is_synced") SELECT "id", "user_id", "name", "completed_at", "created_at", "updated_at", "deleted_at", "is_synced" FROM `workouts`;--> statement-breakpoint
DROP TABLE `workouts`;--> statement-breakpoint
ALTER TABLE `__new_workouts` RENAME TO `workouts`;