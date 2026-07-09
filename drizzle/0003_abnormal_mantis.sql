CREATE TABLE `sync_metadata` (
	`key` text PRIMARY KEY NOT NULL,
	`last_sync` text NOT NULL,
	`sync_count` integer DEFAULT 0,
	`last_error` text
);
