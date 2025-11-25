-- Drop old payment_history table
DROP TABLE IF EXISTS payment_history;

-- Create bill_cycles table
CREATE TABLE `bill_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL,
	`start_date` integer NOT NULL,
	`end_date` integer NOT NULL,
	`expected_amount` real NOT NULL,
	`total_paid` real DEFAULT 0 NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE cascade
);

-- Create bill_payments table
CREATE TABLE `bill_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`amount` real NOT NULL,
	`payment_date` integer NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`bill_id`) REFERENCES `bills`(`id`) ON DELETE cascade,
	FOREIGN KEY (`cycle_id`) REFERENCES `bill_cycles`(`id`) ON DELETE cascade
);
