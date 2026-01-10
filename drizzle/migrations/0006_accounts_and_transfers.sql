-- Add accounts table and transfer metadata
CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`is_external` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_name_unique` ON `accounts` (`name`);
--> statement-breakpoint
ALTER TABLE `imported_transactions` ADD `is_transfer` integer DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE `imported_transactions` ADD `counterparty_account_id` integer;
--> statement-breakpoint
ALTER TABLE `imported_transactions` ADD `transfer_category_id` integer;
