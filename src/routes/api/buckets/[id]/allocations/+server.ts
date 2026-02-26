import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getAllocationsForBucket,
	createAllocation,
	updateAllocation,
	deleteAllocation
} from '$lib/server/db/bucket-queries';
import { parseLocalDate } from '$lib/utils/dates';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const bucketId = parseInt(params.id);
		const allocations = await getAllocationsForBucket(bucketId);
		return json(allocations);
	} catch (error) {
		console.error('Error fetching allocations:', error);
		return json({ error: 'Failed to fetch allocations' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const bucketId = parseInt(params.id);
		const data = await request.json();

		// Validate required fields
		if (data.amount === undefined || !data.targetDate) {
			return json({ error: 'Missing required fields: amount and targetDate' }, { status: 400 });
		}

		if (data.amount <= 0) {
			return json({ error: 'Amount must be greater than zero' }, { status: 400 });
		}

		const allocation = await createAllocation({
			bucketId,
			amount: data.amount,
			targetDate:
				typeof data.targetDate === 'string'
					? parseLocalDate(data.targetDate.split('T')[0])
					: new Date(data.targetDate),
			notes: data.notes || null
		});

		return json(allocation, { status: 201 });
	} catch (error) {
		console.error('Error creating allocation:', error);
		return json({ error: 'Failed to create allocation' }, { status: 500 });
	}
};

export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.id) {
			return json({ error: 'Missing allocation id' }, { status: 400 });
		}

		const updateData: Record<string, unknown> = {};
		if (data.amount !== undefined) updateData.amount = data.amount;
		if (data.notes !== undefined) updateData.notes = data.notes;
		if (data.targetDate !== undefined) {
			updateData.targetDate =
				typeof data.targetDate === 'string'
					? parseLocalDate(data.targetDate.split('T')[0])
					: new Date(data.targetDate);
		}

		const allocation = await updateAllocation(data.id, updateData);

		if (!allocation) {
			return json({ error: 'Allocation not found' }, { status: 404 });
		}

		return json(allocation);
	} catch (error) {
		console.error('Error updating allocation:', error);
		return json({ error: 'Failed to update allocation' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.id) {
			return json({ error: 'Missing allocation id' }, { status: 400 });
		}

		await deleteAllocation(data.id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting allocation:', error);
		return json({ error: 'Failed to delete allocation' }, { status: 500 });
	}
};
