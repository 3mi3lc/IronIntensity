CREATE TABLE `community_cache` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pending_kudos` (
	`feed_event_id` text NOT NULL,
	`user_id` text NOT NULL,
	`action` text NOT NULL,
	`updated_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	PRIMARY KEY(`feed_event_id`, `user_id`)
);
