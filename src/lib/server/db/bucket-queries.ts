import { db } from './index';
import { buckets, bucketCycles, bucketTransactions } from './schema';
import type {
	Bucket,
	NewBucket,
	BucketCycle,
	NewBucketCycle,
	BucketTransaction,
	NewBucketTransaction
} from './schema';
import type { BucketWithCycle, BucketCycleWithComputed } from '$lib/types/bucket';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import {
	calculateCycleDates,
	findCycleForTimestamp,
	generateCyclesBetween
} from '../utils/bucket-cycle-calculator';
import { isBefore, isAfter } from 'date-fns';

/**
 * Get all non-deleted buckets
 */
export async function getAllBuckets(): Promise<Bucket[]> {
	return db.select().from(buckets).where(eq(buckets.isDeleted, false)).orderBy(asc(buckets.name));
}

/**
 * Get bucket by ID
 */
export async function getBucketById(id: number): Promise<Bucket | undefined> {
	const result = await db.select().from(buckets).where(eq(buckets.id, id)).limit(1);
	return result[0];
}

/**
 * Get bucket with current cycle
 */
export async function getBucketWithCurrentCycle(id: number): Promise<BucketWithCycle | undefined> {
	const bucket = await getBucketById(id);
	if (!bucket) return undefined;

	await ensureCyclesExist(bucket);

	const currentCycle = await getCurrentCycle(bucket.id);

	return {
		...bucket,
		currentCycle: currentCycle ? addComputedFields(currentCycle) : null
	};
}

/**
 * Get all buckets with their current cycles
 */
export async function getAllBucketsWithCurrentCycle(): Promise<BucketWithCycle[]> {
	const allBuckets = await getAllBuckets();

	const bucketsWithCycles = await Promise.all(
		allBuckets.map(async (bucket) => {
			await ensureCyclesExist(bucket);
			const currentCycle = await getCurrentCycle(bucket.id);

			return {
				...bucket,
				currentCycle: currentCycle ? addComputedFields(currentCycle) : null
			};
		})
	);

	return bucketsWithCycles;
}

/**
 * Create a new bucket and its first cycle
 */
export async function createBucket(data: NewBucket): Promise<Bucket> {
	const result = await db.insert(buckets).values(data).returning();
	const bucket = result[0];

	// Generate the first cycle
	await ensureCyclesExist(bucket);

	return bucket;
}

/**
 * Update a bucket (affects current and future cycles only)
 */
export async function updateBucket(id: number, data: Partial<NewBucket>): Promise<Bucket | undefined> {
	const result = await db
		.update(buckets)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(buckets.id, id))
		.returning();

	if (result.length === 0) return undefined;

	const bucket = result[0];

	// If budget amount changed, update current and future cycles
	if (data.budgetAmount !== undefined) {
		await updateFutureCycleBudgets(bucket.id, data.budgetAmount);
	}

	return bucket;
}

/**
 * Soft delete a bucket
 */
export async function deleteBucket(id: number): Promise<void> {
	await db
		.update(buckets)
		.set({
			isDeleted: true,
			updatedAt: new Date()
		})
		.where(eq(buckets.id, id));
}

/**
 * Get current cycle for a bucket
 */
export async function getCurrentCycle(bucketId: number): Promise<BucketCycle | undefined> {
	const now = new Date();
	const result = await db
		.select()
		.from(bucketCycles)
		.where(
			and(
				eq(bucketCycles.bucketId, bucketId),
				sql`${bucketCycles.startDate} <= ${now}`,
				sql`${bucketCycles.endDate} >= ${now}`
			)
		)
		.limit(1);

	return result[0];
}

/**
 * Get all cycles for a bucket
 */
export async function getCyclesForBucket(bucketId: number): Promise<BucketCycle[]> {
	return db
		.select()
		.from(bucketCycles)
		.where(eq(bucketCycles.bucketId, bucketId))
		.orderBy(desc(bucketCycles.startDate));
}

/**
 * Ensure cycles exist up to the current date
 */
async function ensureCyclesExist(bucket: Bucket): Promise<void> {
	const now = new Date();

	// Get the latest cycle
	const latestCycle = await db
		.select()
		.from(bucketCycles)
		.where(eq(bucketCycles.bucketId, bucket.id))
		.orderBy(desc(bucketCycles.endDate))
		.limit(1);

	let startFrom: Date;

	if (latestCycle.length === 0) {
		// No cycles exist, start from anchor date
		startFrom = bucket.anchorDate;
	} else {
		const latest = latestCycle[0];

		// If current cycle exists, we're done
		if (isAfter(latest.endDate, now) || latest.endDate.getTime() === now.getTime()) {
			return;
		}

		// Start from the next cycle after the latest
		const nextCycleDates = calculateCycleDates(
			bucket.frequency,
			bucket.anchorDate,
			new Date(latest.endDate.getTime() + 24 * 60 * 60 * 1000)
		);
		startFrom = nextCycleDates.startDate;

		// Close the latest cycle if it's not already closed
		if (!latest.isClosed) {
			await closeCycle(latest.id);
		}
	}

	// Generate all missing cycles up to now
	const cycles = generateCyclesBetween(bucket.frequency, bucket.anchorDate, startFrom, now);

	for (const cycle of cycles) {
		// Get the carryover from the previous cycle
		const previousCycle = await db
			.select()
			.from(bucketCycles)
			.where(
				and(
					eq(bucketCycles.bucketId, bucket.id),
					sql`${bucketCycles.endDate} < ${cycle.startDate}`
				)
			)
			.orderBy(desc(bucketCycles.endDate))
			.limit(1);

		let carryoverAmount = 0;

		if (previousCycle.length > 0 && bucket.enableCarryover) {
			const prev = previousCycle[0];
			const startingBalance = prev.budgetAmount + prev.carryoverAmount;
			const remaining = startingBalance - prev.totalSpent;
			carryoverAmount = remaining;
		}

		await db.insert(bucketCycles).values({
			bucketId: bucket.id,
			startDate: cycle.startDate,
			endDate: cycle.endDate,
			budgetAmount: bucket.budgetAmount,
			carryoverAmount,
			totalSpent: 0,
			isClosed: false
		});
	}
}

/**
 * Close a cycle
 */
async function closeCycle(cycleId: number): Promise<void> {
	await db
		.update(bucketCycles)
		.set({
			isClosed: true,
			updatedAt: new Date()
		})
		.where(eq(bucketCycles.id, cycleId));
}

/**
 * Update budget amount for current and future cycles
 */
async function updateFutureCycleBudgets(bucketId: number, newBudgetAmount: number): Promise<void> {
	const now = new Date();

	await db
		.update(bucketCycles)
		.set({
			budgetAmount: newBudgetAmount,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(bucketCycles.bucketId, bucketId),
				sql`${bucketCycles.startDate} >= ${now}`
			)
		);

	// Also update the current cycle
	const currentCycle = await getCurrentCycle(bucketId);
	if (currentCycle) {
		await db
			.update(bucketCycles)
			.set({
				budgetAmount: newBudgetAmount,
				updatedAt: new Date()
			})
			.where(eq(bucketCycles.id, currentCycle.id));
	}
}

/**
 * Add computed fields to a cycle
 */
function addComputedFields(cycle: BucketCycle): BucketCycleWithComputed {
	const startingBalance = cycle.budgetAmount + cycle.carryoverAmount;
	const remaining = startingBalance - cycle.totalSpent;

	return {
		...cycle,
		startingBalance,
		remaining
	};
}

/**
 * Create a transaction and update cycle totals
 */
export async function createTransaction(data: NewBucketTransaction): Promise<BucketTransaction> {
	const bucket = await getBucketById(data.bucketId);
	if (!bucket) throw new Error('Bucket not found');

	// Ensure cycles exist
	await ensureCyclesExist(bucket);

	// Find which cycle this transaction belongs to
	const cycleDates = findCycleForTimestamp(bucket.frequency, bucket.anchorDate, data.timestamp);

	// Get or create the cycle
	let cycle = await db
		.select()
		.from(bucketCycles)
		.where(
			and(
				eq(bucketCycles.bucketId, data.bucketId),
				eq(bucketCycles.startDate, cycleDates.startDate)
			)
		)
		.limit(1);

	if (cycle.length === 0) {
		// Create the cycle if it doesn't exist (for backdated transactions)
		const newCycleResult = await db
			.insert(bucketCycles)
			.values({
				bucketId: data.bucketId,
				startDate: cycleDates.startDate,
				endDate: cycleDates.endDate,
				budgetAmount: bucket.budgetAmount,
				carryoverAmount: 0, // Will be recalculated
				totalSpent: 0,
				isClosed: isBefore(cycleDates.endDate, new Date())
			})
			.returning();

		cycle = newCycleResult;
	}

	const cycleId = cycle[0].id;

	// Insert the transaction
	const result = await db
		.insert(bucketTransactions)
		.values({
			...data,
			cycleId
		})
		.returning();

	// Recalculate cycles from this point forward
	await recalculateCyclesFrom(bucket, cycleDates.startDate);

	return result[0];
}

/**
 * Update a transaction and recalculate affected cycles
 */
export async function updateTransaction(
	id: number,
	data: Partial<NewBucketTransaction>
): Promise<BucketTransaction | undefined> {
	const existing = await db
		.select()
		.from(bucketTransactions)
		.where(eq(bucketTransactions.id, id))
		.limit(1);

	if (existing.length === 0) return undefined;

	const oldTransaction = existing[0];
	const bucket = await getBucketById(oldTransaction.bucketId);
	if (!bucket) throw new Error('Bucket not found');

	// If timestamp changed, we need to move the transaction to a different cycle
	let newCycleId = oldTransaction.cycleId;

	if (data.timestamp && data.timestamp.getTime() !== oldTransaction.timestamp.getTime()) {
		const newCycleDates = findCycleForTimestamp(bucket.frequency, bucket.anchorDate, data.timestamp);

		const newCycle = await db
			.select()
			.from(bucketCycles)
			.where(
				and(
					eq(bucketCycles.bucketId, bucket.id),
					eq(bucketCycles.startDate, newCycleDates.startDate)
				)
			)
			.limit(1);

		if (newCycle.length > 0) {
			newCycleId = newCycle[0].id;
		}
	}

	const result = await db
		.update(bucketTransactions)
		.set({
			...data,
			cycleId: newCycleId,
			updatedAt: new Date()
		})
		.where(eq(bucketTransactions.id, id))
		.returning();

	// Recalculate all affected cycles
	const oldCycle = await db
		.select()
		.from(bucketCycles)
		.where(eq(bucketCycles.id, oldTransaction.cycleId))
		.limit(1);

	if (oldCycle.length > 0) {
		await recalculateCyclesFrom(bucket, oldCycle[0].startDate);
	}

	return result[0];
}

/**
 * Delete a transaction and recalculate cycles
 */
export async function deleteTransaction(id: number): Promise<void> {
	const transaction = await db
		.select()
		.from(bucketTransactions)
		.where(eq(bucketTransactions.id, id))
		.limit(1);

	if (transaction.length === 0) return;

	const bucket = await getBucketById(transaction[0].bucketId);
	if (!bucket) return;

	const cycle = await db
		.select()
		.from(bucketCycles)
		.where(eq(bucketCycles.id, transaction[0].cycleId))
		.limit(1);

	await db.delete(bucketTransactions).where(eq(bucketTransactions.id, id));

	if (cycle.length > 0) {
		await recalculateCyclesFrom(bucket, cycle[0].startDate);
	}
}

/**
 * Get all transactions for a bucket
 */
export async function getTransactionsForBucket(bucketId: number): Promise<BucketTransaction[]> {
	return db
		.select()
		.from(bucketTransactions)
		.where(eq(bucketTransactions.bucketId, bucketId))
		.orderBy(desc(bucketTransactions.timestamp));
}

/**
 * Get all transactions for a cycle
 */
export async function getTransactionsForCycle(cycleId: number): Promise<BucketTransaction[]> {
	return db
		.select()
		.from(bucketTransactions)
		.where(eq(bucketTransactions.cycleId, cycleId))
		.orderBy(desc(bucketTransactions.timestamp));
}

/**
 * Recalculate all cycles from a starting date forward
 */
async function recalculateCyclesFrom(bucket: Bucket, startDate: Date): Promise<void> {
	// Get all cycles from the start date forward
	const cycles = await db
		.select()
		.from(bucketCycles)
		.where(
			and(
				eq(bucketCycles.bucketId, bucket.id),
				sql`${bucketCycles.startDate} >= ${startDate}`
			)
		)
		.orderBy(asc(bucketCycles.startDate));

	for (const cycle of cycles) {
		// Calculate total spent for this cycle
		const transactions = await getTransactionsForCycle(cycle.id);
		const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);

		// Get carryover from previous cycle
		const previousCycle = await db
			.select()
			.from(bucketCycles)
			.where(
				and(
					eq(bucketCycles.bucketId, bucket.id),
					sql`${bucketCycles.endDate} < ${cycle.startDate}`
				)
			)
			.orderBy(desc(bucketCycles.endDate))
			.limit(1);

		let carryoverAmount = 0;

		if (previousCycle.length > 0 && bucket.enableCarryover) {
			const prev = previousCycle[0];
			const startingBalance = prev.budgetAmount + prev.carryoverAmount;
			const remaining = startingBalance - prev.totalSpent;
			carryoverAmount = remaining;
		}

		// Update the cycle
		await db
			.update(bucketCycles)
			.set({
				totalSpent,
				carryoverAmount,
				updatedAt: new Date()
			})
			.where(eq(bucketCycles.id, cycle.id));
	}
}
