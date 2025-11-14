import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createBill, getAllBills } from '$lib/server/db/queries';
import type { NewBill } from '$lib/server/db/schema';

// GET /api/bills - Get all bills
export const GET: RequestHandler = async ({ url }) => {
	try {
		const status = url.searchParams.get('status') as any;
		const categoryId = url.searchParams.get('categoryId');
		const searchQuery = url.searchParams.get('search');
		const sortField = url.searchParams.get('sortField') as any;
		const sortDirection = url.searchParams.get('sortDirection') as any;

		const filters = {
			status: status || 'all',
			categoryId: categoryId ? parseInt(categoryId) : undefined,
			searchQuery: searchQuery || undefined
		};

		const sort = sortField
			? {
					field: sortField || 'dueDate',
					direction: sortDirection || 'asc'
				}
			: undefined;

		const bills = getAllBills(filters, sort);
		return json(bills);
	} catch (error) {
		console.error('Error fetching bills:', error);
		return json({ error: 'Failed to fetch bills' }, { status: 500 });
	}
};

// POST /api/bills - Create a new bill
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.name || !data.amount || !data.dueDate) {
			return json({ error: 'Missing required fields' }, { status: 400 });
		}

		const newBill: NewBill = {
			name: data.name,
			amount: parseFloat(data.amount),
			dueDate: new Date(data.dueDate),
			paymentLink: data.paymentLink || null,
			categoryId: data.categoryId || null,
			isRecurring: data.isRecurring || false,
			recurrenceType: data.recurrenceType || null,
			recurrenceDay: data.recurrenceDay || null,
			isPaid: data.isPaid || false,
			isAutopay: data.isAutopay || false,
			notes: data.notes || null
		};

		const bill = createBill(newBill);
		return json(bill, { status: 201 });
	} catch (error) {
		console.error('Error creating bill:', error);
		return json({ error: 'Failed to create bill' }, { status: 500 });
	}
};
