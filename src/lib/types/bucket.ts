import type {
	Bucket,
	BucketCycle,
	BucketTransaction,
	BucketAllocation
} from '$lib/server/db/schema';

export type FrequencyType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

// Extended bucket type with current cycle and computed values
export interface BucketWithCycle extends Bucket {
	currentCycle?: BucketCycleWithComputed | null;
}

// Cycle with computed values
export interface BucketCycleWithComputed extends BucketCycle {
	startingBalance: number; // budgetAmount + allocatedAmount + carryoverAmount
	remaining: number; // startingBalance - totalSpent
	allocations: BucketAllocation[]; // allocations that fall within this cycle
}

// Form data for creating/editing planned allocations
export interface BucketAllocationFormData {
	bucketId: number;
	amount: number;
	targetDate: Date;
	notes?: string;
}

// Export database types
export type { Bucket, BucketCycle, BucketTransaction, BucketAllocation };
