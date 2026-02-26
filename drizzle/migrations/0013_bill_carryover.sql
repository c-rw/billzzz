ALTER TABLE bills ADD COLUMN `enable_carryover` integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE bill_cycles ADD COLUMN `carryover_amount` real NOT NULL DEFAULT 0;