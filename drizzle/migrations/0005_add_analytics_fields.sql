-- Add analytics fields to user_preferences table
ALTER TABLE `user_preferences` ADD `expected_income_amount` real;
--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `current_balance` real;
--> statement-breakpoint
ALTER TABLE `user_preferences` ADD `last_balance_update` integer;
