import type { DebtRateBucket } from '$lib/server/db/schema';

/**
 * Calculate weighted average rate across all buckets
 * This is a shared utility that can be used in both client and server code
 */
export function calculateWeightedAverageRate(buckets: DebtRateBucket[]): number {
	if (buckets.length === 0) return 0;

	const totalBalance = buckets.reduce((sum, b) => sum + b.balance, 0);
	if (totalBalance === 0) return 0;

	const weightedSum = buckets.reduce(
		(sum, b) => sum + (b.interestRate * b.balance / totalBalance),
		0
	);

	return weightedSum;
}

/**
 * Check if a debt has any active rate buckets
 */
export function hasRateBuckets(buckets: DebtRateBucket[] | undefined): boolean {
	return buckets !== undefined && buckets.length > 0;
}
