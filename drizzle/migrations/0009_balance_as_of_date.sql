-- Add balance_as_of_date column to accounts table
-- When set, balance calculation only includes transactions after this date
-- When NULL, all transactions are included (backward compatible with initial_balance behavior)
ALTER TABLE accounts ADD COLUMN balance_as_of_date integer;
