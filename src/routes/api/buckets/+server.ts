import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllBucketsWithCurrentCycle, createBucket } from '$lib/server/db/bucket-queries';

export const GET: RequestHandler = async () => {
	try {
		const buckets = await getAllBucketsWithCurrentCycle();
		return json(buckets);
	} catch (error) {
		console.error('Error fetching buckets:', error);
		return json({ error: 'Failed to fetch buckets' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.name || !data.frequency || data.budgetAmount === undefined) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		// Convert date string to Date object
		const anchorDate = data.anchorDate ? new Date(data.anchorDate) : new Date();

		const bucket = await createBucket({
			name: data.name,
			frequency: data.frequency,
			budgetAmount: data.budgetAmount,
			enableCarryover: data.enableCarryover ?? true,
			icon: data.icon,
			color: data.color,
			anchorDate,
			isDeleted: false
		});

		return json(bucket, { status: 201 });
	} catch (error) {
		console.error('Error creating bucket:', error);
		return json({ error: 'Failed to create bucket' }, { status: 500 });
	}
};
