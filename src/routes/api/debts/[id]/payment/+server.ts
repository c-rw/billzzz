import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDebtById, recordDebtPayment } from '$lib/server/db/debt-queries';

export const POST: RequestHandler = async ({ params, request }) => {
	try {
		const debtId = parseInt(params.id);
		const data = await request.json();

		// Check if debt exists
		const debt = getDebtById(debtId);
		if (!debt) {
			return json({ error: 'Debt not found' }, { status: 404 });
		}

		// Validation
		if (typeof data.amount !== 'number' || data.amount <= 0) {
			return json({ error: 'Payment amount must be a positive number' }, { status: 400 });
		}

		if (data.amount > debt.currentBalance) {
			return json(
				{ error: 'Payment amount cannot exceed current balance' },
				{ status: 400 }
			);
		}

		if (!data.paymentDate) {
			return json({ error: 'Payment date is required' }, { status: 400 });
		}

		const payment = recordDebtPayment({
			debtId,
			amount: data.amount,
			paymentDate: new Date(data.paymentDate),
			notes: data.notes?.trim() || null
		});

		return json(payment, { status: 201 });
	} catch (error) {
		console.error('Error recording debt payment:', error);
		return json({ error: 'Failed to record payment' }, { status: 500 });
	}
};
