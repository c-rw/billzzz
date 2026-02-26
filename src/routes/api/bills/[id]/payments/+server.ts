import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPaymentsForBill, createPayment } from '$lib/server/db/bill-queries';
import { parseLocalDate } from '$lib/utils/dates';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const payments = await getPaymentsForBill(id);
		return json(payments);
	} catch (error) {
		console.error('Error fetching payments:', error);
		return json({ error: 'Failed to fetch payments' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		const payment = await createPayment({
			billId: id,
			amount: parseFloat(data.amount),
			paymentDate: data.paymentDate ? parseLocalDate(data.paymentDate.split('T')[0]) : new Date(),
			notes: data.notes
		});

		return json(payment, { status: 201 });
	} catch (error) {
		console.error('Error creating payment:', error);
		return json({ error: 'Failed to create payment' }, { status: 500 });
	}
};
