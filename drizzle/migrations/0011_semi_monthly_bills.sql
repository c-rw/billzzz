-- Add recurrence_day_2 column to bills table for semi-monthly billing.
-- Semi-monthly bills use two days per month (recurrence_day and recurrence_day_2).
ALTER TABLE bills ADD COLUMN recurrence_day_2 integer;
