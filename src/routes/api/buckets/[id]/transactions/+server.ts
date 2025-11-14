import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getTransactionsForBucket,
	createTransaction
} from '$lib/server/db/bucket-queries';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const bucketId = parseInt(params.id);
		const transactions = await getTransactionsForBucket(bucketId);
		return json(transactions);
	} catch (error) {
		console.error('Error fetching transactions:', error);
		return json({ error: 'Failed to fetch transactions' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const bucketId = parseInt(params.id);
		const data = await request.json();

		// Validate required fields
		if (data.amount === undefined || !data.timestamp) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const transaction = await createTransaction({
			bucketId,
			amount: data.amount,
			timestamp: new Date(data.timestamp),
			vendor: data.vendor,
			notes: data.notes
		});

		return json(transaction, { status: 201 });
	} catch (error) {
		console.error('Error creating transaction:', error);
		return json({ error: 'Failed to create transaction' }, { status: 500 });
	}
};
