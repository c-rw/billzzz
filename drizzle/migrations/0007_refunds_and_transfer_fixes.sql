-- Add owner_account_id: tracks which account owns this imported transaction (populated from OFX ACCTID)
ALTER TABLE `imported_transactions` ADD `owner_account_id` integer REFERENCES `accounts`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
-- Add is_potential_transfer: true when OFX TRNTYPE = 'XFER', hints the UI to pre-select Transfer action
ALTER TABLE `imported_transactions` ADD `is_potential_transfer` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- Add is_refund: true when the user marks this CREDIT transaction as a refund
ALTER TABLE `imported_transactions` ADD `is_refund` integer DEFAULT false NOT NULL;
--> statement-breakpoint
-- Add refunded_bucket_id: which bucket this refund credits back
ALTER TABLE `imported_transactions` ADD `refunded_bucket_id` integer REFERENCES `buckets`(`id`) ON DELETE SET NULL;
--> statement-breakpoint
-- Add refunded_bill_id: which bill this refund credits back
ALTER TABLE `imported_transactions` ADD `refunded_bill_id` integer REFERENCES `bills`(`id`) ON DELETE SET NULL;
