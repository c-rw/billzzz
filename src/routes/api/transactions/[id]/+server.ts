import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updateTransaction, deleteTransaction } from '$lib/server/db/bucket-queries';

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Convert date string to Date object if present
		if (data.timestamp) {
			data.timestamp = new Date(data.timestamp);
		}

		const transaction = await updateTransaction(id, data);

		if (!transaction) {
			return json({ error: 'Transaction not found' }, { status: 404 });
		}

		return json(transaction);
	} catch (error) {
		console.error('Error updating transaction:', error);
		return json({ error: 'Failed to update transaction' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Convert date string to Date object if present
		if (data.timestamp) {
			data.timestamp = new Date(data.timestamp);
		}

		const transaction = await updateTransaction(id, data);

		if (!transaction) {
			return json({ error: 'Transaction not found' }, { status: 404 });
		}

		return json(transaction);
	} catch (error) {
		console.error('Error updating transaction:', error);
		return json({ error: 'Failed to update transaction' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		await deleteTransaction(id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting transaction:', error);
		return json({ error: 'Failed to delete transaction' }, { status: 500 });
	}
};
