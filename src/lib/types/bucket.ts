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

// Transaction with bucket details
export interface TransactionWithBucket extends BucketTransaction {
	bucket?: Bucket | null;
}

// Form data for creating/editing buckets
export interface BucketFormData {
	name: string;
	frequency: FrequencyType;
	budgetAmount: number;
	enableCarryover: boolean;
	icon?: string;
	color?: string;
	anchorDate: Date;
}

// Form data for creating/editing transactions
export interface TransactionFormData {
	bucketId: number;
	amount: number;
	timestamp: Date;
	vendor?: string;
	notes?: string;
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
