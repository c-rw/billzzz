import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDebtById, updateDebt, deleteDebt } from '$lib/server/db/debt-queries';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const debt = getDebtById(id);

		if (!debt) {
			return json({ error: 'Debt not found' }, { status: 404 });
		}

		return json(debt);
	} catch (error) {
		console.error('Error fetching debt:', error);
		return json({ error: 'Failed to fetch debt' }, { status: 500 });
	}
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Check if debt exists
		const existing = getDebtById(id);
		if (!existing) {
			return json({ error: 'Debt not found' }, { status: 404 });
		}

		// Validate updated fields
		if (data.name !== undefined && data.name.trim() === '') {
			return json({ error: 'Name cannot be empty' }, { status: 400 });
		}

		if (data.currentBalance !== undefined && data.currentBalance < 0) {
			return json({ error: 'Current balance must be non-negative' }, { status: 400 });
		}

		if (
			data.interestRate !== undefined &&
			(data.interestRate < 0 || data.interestRate > 100)
		) {
			return json({ error: 'Interest rate must be between 0 and 100' }, { status: 400 });
		}

		if (data.minimumPayment !== undefined && data.minimumPayment <= 0) {
			return json({ error: 'Minimum payment must be positive' }, { status: 400 });
		}

		const updated = updateDebt(id, {
			...(data.name && { name: data.name.trim() }),
			...(data.originalBalance !== undefined && { originalBalance: data.originalBalance }),
			...(data.currentBalance !== undefined && { currentBalance: data.currentBalance }),
			...(data.interestRate !== undefined && { interestRate: data.interestRate }),
			...(data.minimumPayment !== undefined && { minimumPayment: data.minimumPayment }),
			...(data.linkedBillId !== undefined && { linkedBillId: data.linkedBillId }),
			...(data.priority !== undefined && { priority: data.priority }),
			...(data.notes !== undefined && { notes: data.notes?.trim() || null })
		});

		return json(updated);
	} catch (error) {
		console.error('Error updating debt:', error);
		return json({ error: 'Failed to update debt' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);

		// Check if debt exists
		const existing = getDebtById(id);
		if (!existing) {
			return json({ error: 'Debt not found' }, { status: 404 });
		}

		deleteDebt(id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting debt:', error);
		return json({ error: 'Failed to delete debt' }, { status: 500 });
	}
};
