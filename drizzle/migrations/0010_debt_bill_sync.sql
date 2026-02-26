-- Add source_bill_cycle_id to debt_payments table
-- When set, this debt payment was auto-created from a bill cycle overpayment.
-- At most one auto-created debt payment per bill cycle.
ALTER TABLE debt_payments ADD COLUMN source_bill_cycle_id integer REFERENCES bill_cycles(id) ON DELETE SET NULL;
