CREATE TABLE `user_achievements` (
	`user_id` text NOT NULL,
	`achievement_id` text NOT NULL,
	`unlocked_at` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`deleted_at` text,
	`is_synced` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`user_id`, `achievement_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
