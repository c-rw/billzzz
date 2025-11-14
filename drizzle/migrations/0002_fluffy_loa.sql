CREATE TABLE `bucket_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`budget_amount` real NOT NULL,
	`carryover_amount` real DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `bucket_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`amount` real NOT NULL,
	`timestamp` integer NOT NULL,
	`vendor` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bucket_id`) REFERENCES `buckets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`cycle_id`) REFERENCES `bucket_cycles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`budget_amount` real NOT NULL,
	`enable_carryover` integer DEFAULT true NOT NULL,
	`icon` text,
	`color` text,
	`anchor_date` integer NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payday_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`frequency` text NOT NULL,
	`day_of_week` integer,
	`day_of_month` integer,
	`day_of_month_2` integer,
	`start_date` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
