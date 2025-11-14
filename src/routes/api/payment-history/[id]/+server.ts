import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deletePaymentHistory } from '$lib/server/db/queries';

// DELETE /api/payment-history/[id] - Delete a payment history entry
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const payment = deletePaymentHistory(id);

		if (!payment) {
			return json({ error: 'Payment history not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting payment history:', error);
		return json({ error: 'Failed to delete payment history' }, { status: 500 });
	}
};
