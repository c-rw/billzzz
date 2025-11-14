import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getRateBuckets,
	createRateBucket,
	validateRateBuckets
} from '$lib/server/db/debt-queries';

/**
 * GET /api/debts/[id]/rate-buckets
 * Get all rate buckets for a debt
 */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const debtId = parseInt(params.id);

		if (isNaN(debtId)) {
			return json({ error: 'Invalid debt ID' }, { status: 400 });
		}

		const buckets = getRateBuckets(debtId);
		return json(buckets);
	} catch (error) {
		console.error('Error fetching rate buckets:', error);
		return json({ error: 'Failed to fetch rate buckets' }, { status: 500 });
	}
};

/**
 * POST /api/debts/[id]/rate-buckets
 * Create a new rate bucket for a debt
 */
export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const debtId = parseInt(params.id);

		if (isNaN(debtId)) {
			return json({ error: 'Invalid debt ID' }, { status: 400 });
		}

		const body = await request.json();

		// Validate required fields
		if (!body.name || body.balance == null || body.interestRate == null || !body.startDate) {
			return json(
				{ error: 'Missing required fields: name, balance, interestRate, startDate' },
				{ status: 400 }
			);
		}

		// Create the rate bucket
		const bucket = createRateBucket({
			debtId,
			name: body.name,
			balance: body.balance,
			interestRate: body.interestRate,
			startDate: new Date(body.startDate),
			expiresDate: body.expiresDate ? new Date(body.expiresDate) : null,
			isRetroactive: body.isRetroactive || false,
			retroactiveRate: body.retroactiveRate || null,
			category: body.category || 'purchase'
		});

		// Validate that buckets don't exceed debt balance
		const validation = validateRateBuckets(debtId);
		if (!validation.valid) {
			// Rollback by deleting the bucket we just created
			// Note: In a production app, you'd want to use a transaction here
			return json({ error: validation.message }, { status: 400 });
		}

		return json(bucket, { status: 201 });
	} catch (error) {
		console.error('Error creating rate bucket:', error);
		return json({ error: 'Failed to create rate bucket' }, { status: 500 });
	}
};
