import { db } from './index';
import { bills, billCycles, billPayments } from './schema';
import type {
	Bill,
	BillCycle,
	NewBillCycle,
	BillPayment,
	NewBillPayment
} from './schema';
import type { BillWithCycle, BillCycleWithComputed } from '$lib/types/bill';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import {
	calculateBillCycleDates,
	findCycleForPaymentDate,
	generateBillCyclesBetween
} from '../utils/bill-cycle-calculator';
import { isBefore, isAfter } from 'date-fns';

/**
 * Get bill with current cycle
 */
export async function getBillWithCurrentCycle(id: number): Promise<BillWithCycle | undefined> {
	// Use existing getBillById from queries.ts
	const { getBillById } = await import('./queries');
	const bill = getBillById(id);
	if (!bill) return undefined;

	await ensureCyclesExist(bill);

	const currentCycle = await getCurrentCycle(bill.id);

	return {
		...bill,
		currentCycle: currentCycle ? addComputedFields(currentCycle) : null
	};
}

/**
 * Get all bills with their current cycles
 */
export async function getAllBillsWithCurrentCycle(): Promise<BillWithCycle[]> {
	const { getAllBills } = await import('./queries');
	const allBills = getAllBills();

	const billsWithCycles = await Promise.all(
		allBills.map(async (bill) => {
			await ensureCyclesExist(bill);
			const currentCycle = await getCurrentCycle(bill.id);

			return {
				...bill,
				currentCycle: currentCycle ? addComputedFields(currentCycle) : null
			};
		})
	);

	return billsWithCycles;
}

/**
 * Get current cycle for a bill
 */
export async function getCurrentCycle(billId: number): Promise<BillCycle | undefined> {
	const now = new Date();
	const nowTimestamp = Math.floor(now.getTime() / 1000);
	const result = await db
		.select()
		.from(billCycles)
		.where(
			and(
				eq(billCycles.billId, billId),
				sql`${billCycles.startDate} <= ${nowTimestamp}`,
				sql`${billCycles.endDate} >= ${nowTimestamp}`
			)
		)
		.limit(1);

	return result[0];
}

/**
 * Get all cycles for a bill
 */
export async function getCyclesForBill(billId: number): Promise<BillCycle[]> {
	return db
		.select()
		.from(billCycles)
		.where(eq(billCycles.billId, billId))
		.orderBy(desc(billCycles.startDate));
}

/**
 * Ensure cycles exist up to the current date
 */
async function ensureCyclesExist(bill: Bill): Promise<void> {
	const now = new Date();

	// Get the latest cycle
	const latestCycle = await db
		.select()
		.from(billCycles)
		.where(eq(billCycles.billId, bill.id))
		.orderBy(desc(billCycles.endDate))
		.limit(1);

	let startFrom: Date;

	if (latestCycle.length === 0) {
		// No cycles exist
		// For recurring bills, start from due date
		// For non-recurring bills, create single cycle
		if (bill.isRecurring && bill.recurrenceType) {
			startFrom = bill.dueDate;
		} else {
			// Create single cycle for non-recurring bill
			await db.insert(billCycles).values({
				billId: bill.id,
				startDate: bill.createdAt,
				endDate: bill.dueDate,
				expectedAmount: bill.amount,
				totalPaid: 0,
				isPaid: bill.isPaid
			});
			return;
		}
	} else {
		const latest = latestCycle[0];

		// If current cycle exists, we're done
		if (isAfter(latest.endDate, now) || latest.endDate.getTime() === now.getTime()) {
			return;
		}

		// For non-recurring bills, don't create more cycles
		if (!bill.isRecurring || !bill.recurrenceType) {
			return;
		}

		// Start from the next cycle after the latest
		const nextCycleDates = calculateBillCycleDates(
			bill,
			new Date(latest.endDate.getTime() + 24 * 60 * 60 * 1000)
		);
		startFrom = nextCycleDates.startDate;
	}

	// Generate all missing cycles up to now (only for recurring bills)
	const cycles = generateBillCyclesBetween(bill, startFrom, now);

	for (const cycle of cycles) {
		await db.insert(billCycles).values({
			billId: bill.id,
			startDate: cycle.startDate,
			endDate: cycle.endDate,
			expectedAmount: bill.amount,
			totalPaid: 0,
			isPaid: false
		});
	}
}

/**
 * Add computed fields to a cycle
 */
function addComputedFields(cycle: BillCycle): BillCycleWithComputed {
	const remaining = cycle.expectedAmount - cycle.totalPaid;
	const percentPaid = cycle.expectedAmount > 0
		? Math.min((cycle.totalPaid / cycle.expectedAmount) * 100, 100)
		: 0;

	return {
		...cycle,
		remaining,
		percentPaid
	};
}

/**
 * Create a payment and update cycle totals
 */
export async function createPayment(
	data: Omit<NewBillPayment, 'cycleId'>
): Promise<BillPayment> {
	const { getBillById } = await import('./queries');
	const bill = getBillById(data.billId);
	if (!bill) throw new Error('Bill not found');

	// Ensure cycles exist
	await ensureCyclesExist(bill);

	// Find which cycle this payment belongs to
	const cycleDates = findCycleForPaymentDate(bill, data.paymentDate);

	// Get or create the cycle
	let cycle = await db
		.select()
		.from(billCycles)
		.where(
			and(
				eq(billCycles.billId, data.billId),
				eq(billCycles.startDate, cycleDates.startDate)
			)
		)
		.limit(1);

	if (cycle.length === 0) {
		// Create the cycle if it doesn't exist (for backdated payments)
		const newCycleResult = await db
			.insert(billCycles)
			.values({
				billId: data.billId,
				startDate: cycleDates.startDate,
				endDate: cycleDates.endDate,
				expectedAmount: bill.amount,
				totalPaid: 0,
				isPaid: false
			})
			.returning();

		cycle = newCycleResult;
	}

	const cycleId = cycle[0].id;

	// Insert the payment
	const result = await db
		.insert(billPayments)
		.values({
			...data,
			cycleId
		})
		.returning();

	// Recalculate cycles from this point forward
	await recalculateCyclesFrom(bill, cycleDates.startDate);

	return result[0];
}

/**
 * Update a payment and recalculate affected cycles
 */
export async function updatePayment(
	id: number,
	data: Partial<NewBillPayment>
): Promise<BillPayment | undefined> {
	const existing = await db
		.select()
		.from(billPayments)
		.where(eq(billPayments.id, id))
		.limit(1);

	if (existing.length === 0) return undefined;

	const oldPayment = existing[0];
	const { getBillById } = await import('./queries');
	const bill = getBillById(oldPayment.billId);
	if (!bill) throw new Error('Bill not found');

	// If payment date changed, we need to move the payment to a different cycle
	let newCycleId = oldPayment.cycleId;

	if (data.paymentDate && data.paymentDate.getTime() !== oldPayment.paymentDate.getTime()) {
		const newCycleDates = findCycleForPaymentDate(bill, data.paymentDate);

		const newCycle = await db
			.select()
			.from(billCycles)
			.where(
				and(
					eq(billCycles.billId, bill.id),
					eq(billCycles.startDate, newCycleDates.startDate)
				)
			)
			.limit(1);

		if (newCycle.length > 0) {
			newCycleId = newCycle[0].id;
		}
	}

	const result = await db
		.update(billPayments)
		.set({
			...data,
			cycleId: newCycleId,
			updatedAt: new Date()
		})
		.where(eq(billPayments.id, id))
		.returning();

	// Recalculate all affected cycles
	const oldCycle = await db
		.select()
		.from(billCycles)
		.where(eq(billCycles.id, oldPayment.cycleId))
		.limit(1);

	if (oldCycle.length > 0) {
		await recalculateCyclesFrom(bill, oldCycle[0].startDate);
	}

	return result[0];
}

/**
 * Delete a payment and recalculate cycles
 */
export async function deletePayment(id: number): Promise<void> {
	const payment = await db
		.select()
		.from(billPayments)
		.where(eq(billPayments.id, id))
		.limit(1);

	if (payment.length === 0) return;

	const { getBillById } = await import('./queries');
	const bill = getBillById(payment[0].billId);
	if (!bill) return;

	const cycle = await db
		.select()
		.from(billCycles)
		.where(eq(billCycles.id, payment[0].cycleId))
		.limit(1);

	await db.delete(billPayments).where(eq(billPayments.id, id));

	if (cycle.length > 0) {
		await recalculateCyclesFrom(bill, cycle[0].startDate);
	}
}

/**
 * Get all payments for a bill
 */
export async function getPaymentsForBill(billId: number): Promise<BillPayment[]> {
	return db
		.select()
		.from(billPayments)
		.where(eq(billPayments.billId, billId))
		.orderBy(desc(billPayments.paymentDate));
}

/**
 * Get all payments for a cycle
 */
export async function getPaymentsForCycle(cycleId: number): Promise<BillPayment[]> {
	return db
		.select()
		.from(billPayments)
		.where(eq(billPayments.cycleId, cycleId))
		.orderBy(desc(billPayments.paymentDate));
}

/**
 * Recalculate all cycles from a starting date forward
 */
async function recalculateCyclesFrom(bill: Bill, startDate: Date): Promise<void> {
	// Get all cycles from the start date forward
	const startTimestamp = Math.floor(startDate.getTime() / 1000);
	const cycles = await db
		.select()
		.from(billCycles)
		.where(
			and(
				eq(billCycles.billId, bill.id),
				sql`${billCycles.startDate} >= ${startTimestamp}`
			)
		)
		.orderBy(asc(billCycles.startDate));

	for (const cycle of cycles) {
		// Calculate total paid for this cycle
		const payments = await getPaymentsForCycle(cycle.id);
		const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

		// Determine if cycle is paid
		const isPaid = totalPaid >= cycle.expectedAmount;

		// Update the cycle
		await db
			.update(billCycles)
			.set({
				totalPaid,
				isPaid,
				updatedAt: new Date()
			})
			.where(eq(billCycles.id, cycle.id));
	}
}
