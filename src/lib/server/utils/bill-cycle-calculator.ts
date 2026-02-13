import type { RecurrenceType } from '$lib/types/bill';
import type { Bill } from '../db/schema';
import {
	addDays,
	addWeeks,
	addMonths,
	addQuarters,
	addYears,
	startOfDay,
	endOfDay,
	isBefore,
	isAfter,
	isWithinInterval
} from 'date-fns';

/**
 * Calculate the cycle dates for a bill based on recurrence pattern and due date
 * For non-recurring bills, creates a single cycle from creation to due date
 */
export function calculateBillCycleDates(
	bill: Bill,
	referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
	// For non-recurring bills, create a single cycle
	if (!bill.isRecurring || !bill.recurrenceType) {
		return {
			startDate: startOfDay(bill.createdAt),
			endDate: endOfDay(bill.dueDate)
		};
	}

	const dueDate = startOfDay(bill.dueDate);
	const ref = startOfDay(referenceDate);

	let cycleStart = dueDate;

	// Move forward from due date to find the cycle containing the reference date
	while (isBefore(getCycleEnd(bill.recurrenceType, cycleStart), ref)) {
		cycleStart = getNextCycleStart(bill.recurrenceType, cycleStart);
	}

	// Move backward if we've gone too far
	while (isAfter(cycleStart, ref)) {
		cycleStart = getPreviousCycleStart(bill.recurrenceType, cycleStart);
	}

	const cycleEnd = getCycleEnd(bill.recurrenceType, cycleStart);

	return {
		startDate: cycleStart,
		endDate: cycleEnd
	};
}

/**
 * Get the end date of a cycle given its start date
 */
function getCycleEnd(recurrenceType: RecurrenceType, cycleStart: Date): Date {
	let end: Date;

	switch (recurrenceType) {
		case 'weekly':
			end = addWeeks(cycleStart, 1);
			break;
		case 'biweekly':
			end = addWeeks(cycleStart, 2);
			break;
		case 'monthly':
			end = addMonths(cycleStart, 1);
			break;
		case 'quarterly':
			end = addQuarters(cycleStart, 1);
			break;
		case 'semi-annual':
			end = addMonths(cycleStart, 6);
			break;
		case 'yearly':
			end = addYears(cycleStart, 1);
			break;
	}

	// End of day before the next cycle starts
	return endOfDay(addDays(end, -1));
}

/**
 * Get the start date of the next cycle
 */
function getNextCycleStart(recurrenceType: RecurrenceType, currentStart: Date): Date {
	switch (recurrenceType) {
		case 'weekly':
			return addWeeks(currentStart, 1);
		case 'biweekly':
			return addWeeks(currentStart, 2);
		case 'monthly':
			return addMonths(currentStart, 1);
		case 'quarterly':
			return addQuarters(currentStart, 1);
		case 'semi-annual':
			return addMonths(currentStart, 6);
		case 'yearly':
			return addYears(currentStart, 1);
	}
}

/**
 * Get the start date of the previous cycle
 */
function getPreviousCycleStart(recurrenceType: RecurrenceType, currentStart: Date): Date {
	switch (recurrenceType) {
		case 'weekly':
			return addWeeks(currentStart, -1);
		case 'biweekly':
			return addWeeks(currentStart, -2);
		case 'monthly':
			return addMonths(currentStart, -1);
		case 'quarterly':
			return addQuarters(currentStart, -1);
		case 'semi-annual':
			return addMonths(currentStart, -6);
		case 'yearly':
			return addYears(currentStart, -1);
	}
}

/**
 * Find which cycle a payment date belongs to
 */
export function findCycleForPaymentDate(
	bill: Bill,
	paymentDate: Date
): { startDate: Date; endDate: Date } {
	return calculateBillCycleDates(bill, paymentDate);
}

/**
 * Generate all cycles between two dates for a bill
 */
export function generateBillCyclesBetween(
	bill: Bill,
	startDate: Date,
	endDate: Date
): Array<{ startDate: Date; endDate: Date }> {
	// For non-recurring bills, return single cycle
	if (!bill.isRecurring || !bill.recurrenceType) {
		return [{
			startDate: startOfDay(bill.createdAt),
			endDate: endOfDay(bill.dueDate)
		}];
	}

	const cycles: Array<{ startDate: Date; endDate: Date }> = [];
	let currentCycle = calculateBillCycleDates(bill, startDate);

	while (isBefore(currentCycle.startDate, endDate) || currentCycle.startDate.getTime() === endDate.getTime()) {
		cycles.push({ ...currentCycle });
		currentCycle = calculateBillCycleDates(
			bill,
			getNextCycleStart(bill.recurrenceType!, currentCycle.startDate)
		);
	}

	return cycles;
}

/**
 * Check if a date is within a cycle
 */
export function isDateInCycle(
	date: Date,
	cycleStart: Date,
	cycleEnd: Date
): boolean {
	return isWithinInterval(date, { start: cycleStart, end: cycleEnd });
}
