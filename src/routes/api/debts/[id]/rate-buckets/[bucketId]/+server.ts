import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getRateBucketById,
	updateRateBucket,
	deleteRateBucket,
	validateRateBuckets
} from '$lib/server/db/debt-queries';

/**
 * PATCH /api/debts/[id]/rate-buckets/[bucketId]
 * Update a rate bucket
 */
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const bucketId = parseInt(params.bucketId);
		const debtId = parseInt(params.id);

		if (isNaN(bucketId) || isNaN(debtId)) {
			return json({ error: 'Invalid bucket or debt ID' }, { status: 400 });
		}

		const body = await request.json();

		// Verify bucket exists and belongs to this debt
		const existingBucket = getRateBucketById(bucketId);
		if (!existingBucket) {
			return json({ error: 'Rate bucket not found' }, { status: 404 });
		}
		if (existingBucket.debtId !== debtId) {
			return json({ error: 'Rate bucket does not belong to this debt' }, { status: 403 });
		}

		// Update the bucket
		const updateData: any = {};
		if (body.name !== undefined) updateData.name = body.name;
		if (body.balance !== undefined) updateData.balance = body.balance;
		if (body.interestRate !== undefined) updateData.interestRate = body.interestRate;
		if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate);
		if (body.expiresDate !== undefined)
			updateData.expiresDate = body.expiresDate ? new Date(body.expiresDate) : null;
		if (body.isRetroactive !== undefined) updateData.isRetroactive = body.isRetroactive;
		if (body.retroactiveRate !== undefined) updateData.retroactiveRate = body.retroactiveRate;
		if (body.category !== undefined) updateData.category = body.category;

		const updatedBucket = updateRateBucket(bucketId, updateData);

		// Validate that buckets don't exceed debt balance
		const validation = validateRateBuckets(debtId);
		if (!validation.valid) {
			return json({ error: validation.message }, { status: 400 });
		}

		return json(updatedBucket);
	} catch (error) {
		console.error('Error updating rate bucket:', error);
		return json({ error: 'Failed to update rate bucket' }, { status: 500 });
	}
};

/**
 * DELETE /api/debts/[id]/rate-buckets/[bucketId]
 * Delete a rate bucket
 */
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const bucketId = parseInt(params.bucketId);
		const debtId = parseInt(params.id);

		if (isNaN(bucketId) || isNaN(debtId)) {
			return json({ error: 'Invalid bucket or debt ID' }, { status: 400 });
		}

		// Verify bucket exists and belongs to this debt
		const existingBucket = getRateBucketById(bucketId);
		if (!existingBucket) {
			return json({ error: 'Rate bucket not found' }, { status: 404 });
		}
		if (existingBucket.debtId !== debtId) {
			return json({ error: 'Rate bucket does not belong to this debt' }, { status: 403 });
		}

		deleteRateBucket(bucketId);

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting rate bucket:', error);
		return json({ error: 'Failed to delete rate bucket' }, { status: 500 });
	}
};
