-- Add new columns to accounts table (table already exists from 0006)
ALTER TABLE `accounts` ADD `account_type` text;
--> statement-breakpoint
ALTER TABLE `accounts` ADD `account_number` text;
--> statement-breakpoint
ALTER TABLE `accounts` ADD `bank_id` text;
--> statement-breakpoint
ALTER TABLE `accounts` ADD `initial_balance` real NOT NULL DEFAULT 0;
--> statement-breakpoint
-- Add account_id to import_sessions
ALTER TABLE `import_sessions` ADD `account_id` integer REFERENCES `accounts`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
-- Create transfers table
CREATE TABLE `transfers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_transaction_id` integer NOT NULL REFERENCES `imported_transactions`(`id`) ON DELETE CASCADE,
	`to_transaction_id` integer NOT NULL REFERENCES `imported_transactions`(`id`) ON DELETE CASCADE,
	`from_account_id` integer NOT NULL REFERENCES `accounts`(`id`) ON DELETE CASCADE,
	`to_account_id` integer NOT NULL REFERENCES `accounts`(`id`) ON DELETE CASCADE,
	`amount` real NOT NULL,
	`status` text NOT NULL DEFAULT 'pending',
	`detected_at` integer DEFAULT (unixepoch()) NOT NULL,
	`confirmed_at` integer
);
