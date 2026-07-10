CREATE TABLE `pending_activity` (
	`id` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`created_at` text DEFAULT 'datetime(''now'')' NOT NULL,
	`is_synced` integer DEFAULT 0 NOT NULL
);
