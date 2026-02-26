-- Bucket planned allocations: extra funds set aside for specific months
CREATE TABLE `bucket_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL REFERENCES `buckets`(`id`) ON DELETE CASCADE,
	`amount` real NOT NULL,
	`target_date` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `bucket_cycles` ADD COLUMN `allocated_amount` real NOT NULL DEFAULT 0;
