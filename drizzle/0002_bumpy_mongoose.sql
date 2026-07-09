PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_exercise_body_parts` (
	`exercise_id` text NOT NULL,
	`body_part_id` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')',
	`updated_at` text DEFAULT 'datetime(''now'')',
	`deleted_at` text,
	`is_synced` integer DEFAULT 0,
	PRIMARY KEY(`exercise_id`, `body_part_id`),
	FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`body_part_id`) REFERENCES `body_parts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_exercise_body_parts`("exercise_id", "body_part_id") SELECT "exercise_id", "body_part_id" FROM `exercise_body_parts`;--> statement-breakpoint
DROP TABLE `exercise_body_parts`;--> statement-breakpoint
ALTER TABLE `__new_exercise_body_parts` RENAME TO `exercise_body_parts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;