CREATE TABLE `body_weight_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`weight` real NOT NULL,
	`recorded_at` text NOT NULL,
	`notes` text,
	`created_at` text DEFAULT 'datetime(''now'')',
	`updated_at` text DEFAULT 'datetime(''now'')',
	`deleted_at` text,
	`is_synced` integer DEFAULT 0,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `workout_exercise_sets` ADD `is_pr` integer DEFAULT 0;
--> statement-breakpoint
ALTER TABLE `workouts` ADD `completed_at` text;
--> statement-breakpoint
UPDATE workouts
SET completed_at = created_at, is_synced = 0
WHERE completed_at IS NULL AND deleted_at IS NULL;
