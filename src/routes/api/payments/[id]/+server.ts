import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { updatePayment, deletePayment } from '$lib/server/db/bill-queries';
import { parseDateString } from '$lib/utils/dates';

async function handleUpdate(params: { id: string }, request: Request) {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		const updateData: any = {};
		if (data.amount !== undefined) updateData.amount = parseFloat(data.amount);
		if (data.paymentDate) updateData.paymentDate = parseDateString(data.paymentDate);
		if (data.notes !== undefined) updateData.notes = data.notes;

		const payment = await updatePayment(id, updateData);

		if (!payment) {
			return json({ error: 'Payment not found' }, { status: 404 });
		}

		return json(payment);
	} catch (error) {
		console.error('Error updating payment:', error);
		return json({ error: 'Failed to update payment' }, { status: 500 });
	}
}

export const PUT: RequestHandler = ({ params, request }) => handleUpdate(params, request);
export const PATCH: RequestHandler = ({ params, request }) => handleUpdate(params, request);

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		await deletePayment(id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting payment:', error);
		return json({ error: 'Failed to delete payment' }, { status: 500 });
	}
};
