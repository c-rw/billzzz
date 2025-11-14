import type { DebtRateBucket } from '$lib/server/db/schema';
import type { MonthlyBucketPayment, PaymentAllocationStrategy } from '$lib/types/debt';

/**
 * Working bucket state during calculation
 */
export interface WorkingBucket extends DebtRateBucket {
	balance: number; // Current balance (may differ from initial)
	currentRate: number; // Current effective rate (may change if promo expired)
	hasExpired: boolean; // Track if promo expired
	initialBalance: number; // Store original balance for reference
}

/**
 * Calculate monthly interest for a rate bucket
 */
export function calculateBucketInterest(
	balance: number,
	annualRate: number
): number {
	const monthlyRate = annualRate / 100 / 12;
	return balance * monthlyRate;
}

/**
 * Get the effective interest rate for a bucket on a given date
 * Handles promotional rate expiration and retroactive interest
 */
export function getEffectiveRate(
	bucket: WorkingBucket,
	currentDate: Date,
	regularRate: number
): { rate: number; expired: boolean; retroactiveInterest: number } {
	// If no expiration date, use the bucket's rate
	if (!bucket.expiresDate) {
		return { rate: bucket.interestRate, expired: false, retroactiveInterest: 0 };
	}

	const expirationDate = new Date(bucket.expiresDate);
	const hasExpired = currentDate >= expirationDate;

	if (!hasExpired) {
		// Still in promotional period
		return { rate: bucket.interestRate, expired: false, retroactiveInterest: 0 };
	}

	// Promo has expired
	if (bucket.isRetroactive && bucket.balance > 0) {
		// Calculate retroactive interest from start date to now
		// This is deferred interest charged if balance wasn't paid off
		const retroRate = bucket.retroactiveRate || regularRate;
		const monthsSinceStart = monthsSinceBetween(new Date(bucket.startDate), currentDate);
		const retroactiveInterest = (bucket.initialBalance * (retroRate / 100 / 12)) * monthsSinceStart;

		return {
			rate: bucket.retroactiveRate || regularRate,
			expired: true,
			retroactiveInterest
		};
	}

	// Non-retroactive: just revert to regular rate
	return {
		rate: regularRate,
		expired: true,
		retroactiveInterest: 0
	};
}

/**
 * Helper to calculate months between two dates
 */
function monthsSinceBetween(startDate: Date, endDate: Date): number {
	const yearsDiff = endDate.getFullYear() - startDate.getFullYear();
	const monthsDiff = endDate.getMonth() - startDate.getMonth();
	return yearsDiff * 12 + monthsDiff;
}

/**
 * Sort buckets by payment allocation strategy
 */
export function sortBuckets(
	buckets: WorkingBucket[],
	strategy: PaymentAllocationStrategy
): WorkingBucket[] {
	switch (strategy) {
		case 'lowest-rate-first':
			// Pay lowest rate first (less urgent)
			return [...buckets].sort((a, b) => a.currentRate - b.currentRate);

		case 'highest-rate-first':
			// Pay highest rate first (most urgent)
			return [...buckets].sort((a, b) => b.currentRate - a.currentRate);

		case 'oldest-first':
			// Pay oldest balance first (FIFO)
			return [...buckets].sort((a, b) => {
				const aDate = new Date(a.startDate).getTime();
				const bDate = new Date(b.startDate).getTime();
				return aDate - bDate;
			});

		default:
			return buckets;
	}
}

/**
 * Allocate a payment amount across multiple rate buckets
 * Returns updated buckets and detailed breakdown
 */
export function allocatePayment(
	buckets: WorkingBucket[],
	paymentAmount: number,
	strategy: PaymentAllocationStrategy,
	regularRate: number,
	currentDate: Date
): { buckets: WorkingBucket[]; breakdown: MonthlyBucketPayment[]; totalInterest: number } {
	const breakdown: MonthlyBucketPayment[] = [];
	let totalInterest = 0;
	let remainingPayment = paymentAmount;

	// Update effective rates for all buckets first
	for (const bucket of buckets) {
		if (bucket.balance <= 0) continue;

		const rateInfo = getEffectiveRate(bucket, currentDate, regularRate);
		bucket.currentRate = rateInfo.rate;

		// Mark if newly expired this month
		const wasExpired = bucket.hasExpired;
		bucket.hasExpired = rateInfo.expired;

		// Calculate interest for this month
		const monthlyInterest = calculateBucketInterest(bucket.balance, bucket.currentRate);
		totalInterest += monthlyInterest;

		// Add retroactive interest if applicable (charged once when expired)
		if (rateInfo.retroactiveInterest > 0 && !wasExpired && bucket.hasExpired) {
			totalInterest += rateInfo.retroactiveInterest;
			bucket.balance += rateInfo.retroactiveInterest; // Add to balance
		}

		// Initialize breakdown entry
		breakdown.push({
			bucketId: bucket.id,
			bucketName: bucket.name,
			payment: 0,
			principal: 0,
			interest: monthlyInterest,
			remainingBalance: bucket.balance,
			interestRate: bucket.currentRate,
			isPromoExpired: !wasExpired && bucket.hasExpired,
			retroactiveInterest: rateInfo.retroactiveInterest
		});
	}

	// Sort buckets according to strategy for payment allocation
	const sortedBuckets = sortBuckets(
		buckets.filter(b => b.balance > 0),
		strategy
	);

	// Allocate payment across buckets
	for (let i = 0; i < sortedBuckets.length && remainingPayment > 0.01; i++) {
		const bucket = sortedBuckets[i];
		const bucketIndex = buckets.findIndex(b => b.id === bucket.id);

		if (bucket.balance <= 0) continue;

		// Determine payment for this bucket
		const paymentForBucket = Math.min(remainingPayment, bucket.balance);
		const principalPayment = paymentForBucket;

		// Update bucket balance
		bucket.balance = Math.max(0, bucket.balance - principalPayment);
		remainingPayment -= paymentForBucket;

		// Update breakdown
		breakdown[bucketIndex].payment = paymentForBucket;
		breakdown[bucketIndex].principal = principalPayment;
		breakdown[bucketIndex].remainingBalance = bucket.balance;
	}

	return {
		buckets,
		breakdown,
		totalInterest
	};
}

/**
 * Initialize working buckets from database buckets
 */
export function initializeWorkingBuckets(buckets: DebtRateBucket[]): WorkingBucket[] {
	return buckets.map(bucket => ({
		...bucket,
		balance: bucket.balance,
		currentRate: bucket.interestRate,
		hasExpired: false,
		initialBalance: bucket.balance
	}));
}

// Re-export shared utilities for convenience
export { hasRateBuckets, calculateWeightedAverageRate } from '$lib/utils/rate-calculations';
