import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBillById, updateBill, deleteBill, markBillAsPaid, addPaymentHistory } from '$lib/server/db/queries';
import { calculateNextDueDate } from '$lib/server/utils/recurrence';

// GET /api/bills/[id] - Get a single bill
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const bill = getBillById(id);

		if (!bill) {
			return json({ error: 'Bill not found' }, { status: 404 });
		}

		return json(bill);
	} catch (error) {
		console.error('Error fetching bill:', error);
		return json({ error: 'Failed to fetch bill' }, { status: 500 });
	}
};

// PUT /api/bills/[id] - Update a bill
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		const updateData: any = {
			name: data.name,
			amount: data.amount ? parseFloat(data.amount) : undefined,
			dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
			paymentLink: data.paymentLink,
			categoryId: data.categoryId,
			isRecurring: data.isRecurring,
			recurrenceType: data.recurrenceType,
			recurrenceDay: data.recurrenceDay,
			isPaid: data.isPaid,
			isAutopay: data.isAutopay,
			notes: data.notes
		};

		// Remove undefined values
		Object.keys(updateData).forEach(
			(key) => updateData[key] === undefined && delete updateData[key]
		);

		const bill = updateBill(id, updateData);

		if (!bill) {
			return json({ error: 'Bill not found' }, { status: 404 });
		}

		return json(bill);
	} catch (error) {
		console.error('Error updating bill:', error);
		return json({ error: 'Failed to update bill' }, { status: 500 });
	}
};

// DELETE /api/bills/[id] - Delete a bill
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const bill = deleteBill(id);

		if (!bill) {
			return json({ error: 'Bill not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting bill:', error);
		return json({ error: 'Failed to delete bill' }, { status: 500 });
	}
};

// PATCH /api/bills/[id] - Mark bill as paid/unpaid
export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const { isPaid, paymentAmount } = await request.json();

		const currentBill = getBillById(id);
		if (!currentBill) {
			return json({ error: 'Bill not found' }, { status: 404 });
		}

		// If marking as paid, record payment history with actual amount paid
		if (isPaid) {
			const amountPaid = paymentAmount !== undefined ? parseFloat(paymentAmount) : currentBill.amount;
			const note = amountPaid !== currentBill.amount
				? `Payment recorded. Original amount: $${currentBill.amount.toFixed(2)}`
				: 'Payment recorded';
			addPaymentHistory(id, amountPaid, note);
		}

		// If marking as paid and bill is recurring, calculate next due date
		if (isPaid && currentBill.isRecurring && currentBill.recurrenceType) {
			const nextDueDate = calculateNextDueDate(
				currentBill.dueDate,
				currentBill.recurrenceType as any,
				currentBill.recurrenceDay
			);

			const bill = updateBill(id, {
				isPaid: false, // Reset to unpaid for next occurrence
				dueDate: nextDueDate
			});

			return json(bill);
		} else {
			// Just mark as paid/unpaid
			const bill = markBillAsPaid(id, isPaid);
			return json(bill);
		}
	} catch (error) {
		console.error('Error updating bill status:', error);
		return json({ error: 'Failed to update bill status' }, { status: 500 });
	}
};
