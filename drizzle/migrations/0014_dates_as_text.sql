-- Convert date-only columns from integer (unix epoch) to text (YYYY-MM-DD).
-- Strategy: CREATE _new table → COPY data → DROP original → RENAME _new.
-- This preserves FK references in other tables because we never rename the
-- original table away (which would cause SQLite 3.26+ to rewrite FK refs).

-- bills
CREATE TABLE `_new_bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`due_date` text NOT NULL,
	`payment_link` text,
	`category_id` integer REFERENCES `categories`(`id`) ON DELETE set null,
	`is_recurring` integer DEFAULT false NOT NULL,
	`recurrence_type` text,
	`recurrence_day` integer,
	`recurrence_day_2` integer,
	`is_paid` integer DEFAULT false NOT NULL,
	`is_autopay` integer DEFAULT false NOT NULL,
	`enable_carryover` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_bills` SELECT `id`, `name`, `amount`, strftime('%Y-%m-%d', `due_date`, 'unixepoch', 'localtime'), `payment_link`, `category_id`, `is_recurring`, `recurrence_type`, `recurrence_day`, `recurrence_day_2`, `is_paid`, `is_autopay`, `enable_carryover`, `notes`, `created_at`, `updated_at` FROM `bills`;
--> statement-breakpoint
DROP TABLE `bills`;
--> statement-breakpoint
ALTER TABLE `_new_bills` RENAME TO `bills`;
--> statement-breakpoint

-- bill_cycles
CREATE TABLE `_new_bill_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL REFERENCES `bills`(`id`) ON DELETE cascade,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`expected_amount` real NOT NULL,
	`carryover_amount` real DEFAULT 0 NOT NULL,
	`total_paid` real DEFAULT 0 NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_bill_cycles` SELECT `id`, `bill_id`, strftime('%Y-%m-%d', `start_date`, 'unixepoch', 'localtime'), strftime('%Y-%m-%d', `end_date`, 'unixepoch', 'localtime'), `expected_amount`, `carryover_amount`, `total_paid`, `is_paid`, `created_at`, `updated_at` FROM `bill_cycles`;
--> statement-breakpoint
DROP TABLE `bill_cycles`;
--> statement-breakpoint
ALTER TABLE `_new_bill_cycles` RENAME TO `bill_cycles`;
--> statement-breakpoint

-- bill_payments
CREATE TABLE `_new_bill_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bill_id` integer NOT NULL REFERENCES `bills`(`id`) ON DELETE cascade,
	`cycle_id` integer NOT NULL REFERENCES `bill_cycles`(`id`) ON DELETE cascade,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_bill_payments` SELECT `id`, `bill_id`, `cycle_id`, `amount`, strftime('%Y-%m-%d', `payment_date`, 'unixepoch', 'localtime'), `notes`, `created_at`, `updated_at` FROM `bill_payments`;
--> statement-breakpoint
DROP TABLE `bill_payments`;
--> statement-breakpoint
ALTER TABLE `_new_bill_payments` RENAME TO `bill_payments`;
--> statement-breakpoint

-- payday_settings
CREATE TABLE `_new_payday_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`frequency` text NOT NULL,
	`day_of_week` integer,
	`day_of_month` integer,
	`day_of_month_2` integer,
	`start_date` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_payday_settings` SELECT `id`, `frequency`, `day_of_week`, `day_of_month`, `day_of_month_2`, CASE WHEN `start_date` IS NOT NULL THEN strftime('%Y-%m-%d', `start_date`, 'unixepoch', 'localtime') ELSE NULL END, `created_at`, `updated_at` FROM `payday_settings`;
--> statement-breakpoint
DROP TABLE `payday_settings`;
--> statement-breakpoint
ALTER TABLE `_new_payday_settings` RENAME TO `payday_settings`;
--> statement-breakpoint

-- debt_payments
CREATE TABLE `_new_debt_payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`debt_id` integer NOT NULL REFERENCES `debts`(`id`) ON DELETE cascade,
	`amount` real NOT NULL,
	`payment_date` text NOT NULL,
	`notes` text,
	`source_bill_cycle_id` integer REFERENCES `bill_cycles`(`id`) ON DELETE set null,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_debt_payments` SELECT `id`, `debt_id`, `amount`, strftime('%Y-%m-%d', `payment_date`, 'unixepoch', 'localtime'), `notes`, `source_bill_cycle_id`, `created_at` FROM `debt_payments`;
--> statement-breakpoint
DROP TABLE `debt_payments`;
--> statement-breakpoint
ALTER TABLE `_new_debt_payments` RENAME TO `debt_payments`;
--> statement-breakpoint

-- buckets
CREATE TABLE `_new_buckets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`frequency` text NOT NULL,
	`budget_amount` real NOT NULL,
	`enable_carryover` integer DEFAULT true NOT NULL,
	`icon` text,
	`color` text,
	`anchor_date` text NOT NULL,
	`is_deleted` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_buckets` SELECT `id`, `name`, `frequency`, `budget_amount`, `enable_carryover`, `icon`, `color`, strftime('%Y-%m-%d', `anchor_date`, 'unixepoch', 'localtime'), `is_deleted`, `created_at`, `updated_at` FROM `buckets`;
--> statement-breakpoint
DROP TABLE `buckets`;
--> statement-breakpoint
ALTER TABLE `_new_buckets` RENAME TO `buckets`;
--> statement-breakpoint

-- bucket_allocations
CREATE TABLE `_new_bucket_allocations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL REFERENCES `buckets`(`id`) ON DELETE cascade,
	`amount` real NOT NULL,
	`target_date` text NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_bucket_allocations` SELECT `id`, `bucket_id`, `amount`, strftime('%Y-%m-%d', `target_date`, 'unixepoch', 'localtime'), `notes`, `created_at`, `updated_at` FROM `bucket_allocations`;
--> statement-breakpoint
DROP TABLE `bucket_allocations`;
--> statement-breakpoint
ALTER TABLE `_new_bucket_allocations` RENAME TO `bucket_allocations`;
--> statement-breakpoint

-- bucket_cycles
CREATE TABLE `_new_bucket_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bucket_id` integer NOT NULL REFERENCES `buckets`(`id`) ON DELETE cascade,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`budget_amount` real NOT NULL,
	`carryover_amount` real DEFAULT 0 NOT NULL,
	`allocated_amount` real DEFAULT 0 NOT NULL,
	`total_spent` real DEFAULT 0 NOT NULL,
	`is_closed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_bucket_cycles` SELECT `id`, `bucket_id`, strftime('%Y-%m-%d', `start_date`, 'unixepoch', 'localtime'), strftime('%Y-%m-%d', `end_date`, 'unixepoch', 'localtime'), `budget_amount`, `carryover_amount`, `allocated_amount`, `total_spent`, `is_closed`, `created_at`, `updated_at` FROM `bucket_cycles`;
--> statement-breakpoint
DROP TABLE `bucket_cycles`;
--> statement-breakpoint
ALTER TABLE `_new_bucket_cycles` RENAME TO `bucket_cycles`;
--> statement-breakpoint

-- accounts (balance_as_of_date is nullable)
CREATE TABLE `_new_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL UNIQUE,
	`account_type` text,
	`account_number` text,
	`bank_id` text,
	`initial_balance` real DEFAULT 0 NOT NULL,
	`balance_as_of_date` text,
	`is_external` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
INSERT INTO `_new_accounts` SELECT `id`, `name`, `account_type`, `account_number`, `bank_id`, `initial_balance`, CASE WHEN `balance_as_of_date` IS NOT NULL THEN strftime('%Y-%m-%d', `balance_as_of_date`, 'unixepoch', 'localtime') ELSE NULL END, `is_external`, `created_at`, `updated_at` FROM `accounts`;
--> statement-breakpoint
DROP TABLE `accounts`;
--> statement-breakpoint
ALTER TABLE `_new_accounts` RENAME TO `accounts`;
