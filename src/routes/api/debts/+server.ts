import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllDebts, getDebtsWithDetails, createDebt } from '$lib/server/db/debt-queries';

export const GET: RequestHandler = async ({ url }) => {
	try {
		const withDetails = url.searchParams.get('details') === 'true';

		const debts = withDetails ? getDebtsWithDetails() : getAllDebts();
		return json(debts);
	} catch (error) {
		console.error('Error fetching debts:', error);
		return json({ error: 'Failed to fetch debts' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validation
		if (!data.name || data.name.trim() === '') {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		if (typeof data.originalBalance !== 'number' || data.originalBalance <= 0) {
			return json({ error: 'Original balance must be a positive number' }, { status: 400 });
		}

		if (typeof data.currentBalance !== 'number' || data.currentBalance < 0) {
			return json({ error: 'Current balance must be a non-negative number' }, { status: 400 });
		}

		if (
			typeof data.interestRate !== 'number' ||
			data.interestRate < 0 ||
			data.interestRate > 100
		) {
			return json({ error: 'Interest rate must be between 0 and 100' }, { status: 400 });
		}

		if (typeof data.minimumPayment !== 'number' || data.minimumPayment <= 0) {
			return json({ error: 'Minimum payment must be a positive number' }, { status: 400 });
		}

		const debt = createDebt({
			name: data.name.trim(),
			originalBalance: data.originalBalance,
			currentBalance: data.currentBalance,
			interestRate: data.interestRate,
			minimumPayment: data.minimumPayment,
			linkedBillId: data.linkedBillId || null,
			priority: data.priority || null,
			notes: data.notes?.trim() || null
		});

		return json(debt, { status: 201 });
	} catch (error) {
		console.error('Error creating debt:', error);
		return json({ error: 'Failed to create debt' }, { status: 500 });
	}
};
