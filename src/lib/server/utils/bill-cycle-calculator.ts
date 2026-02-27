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
	setDate,
	getDaysInMonth,
	lastDayOfMonth
} from 'date-fns';
import { utcDateToLocal } from '$lib/utils/dates';

/**
 * Get the two sorted semi-monthly days from a bill's recurrenceDay/recurrenceDay2.
 */
function getSemiMonthlyDays(bill: Bill): [number, number] {
	const d1 = (bill as any).recurrenceDay || 1;
	const d2 = (bill as any).recurrenceDay2 || 15;
	return d1 < d2 ? [d1, d2] : [d2, d1];
}

/**
 * For a semi-monthly bill, find the cycle start date that contains or is just at `ref`.
 * Returns the start-of-day Date for that cycle.
 */
function semiMonthlyCycleStart(ref: Date, firstDay: number, secondDay: number): Date {
	const day = ref.getDate();
	const year = ref.getFullYear();
	const month = ref.getMonth();

	const daysInMonth = getDaysInMonth(ref);
	const clampedSecond = Math.min(secondDay, daysInMonth);

	if (day >= clampedSecond) {
		// In the second half-cycle
		return startOfDay(new Date(year, month, clampedSecond));
	} else {
		const clampedFirst = Math.min(firstDay, daysInMonth);
		if (day >= clampedFirst) {
			return startOfDay(new Date(year, month, clampedFirst));
		}
		// Before the first day this month — belongs to previous month's second half
		const prevMonth = new Date(year, month - 1, 1);
		const daysInPrev = getDaysInMonth(prevMonth);
		const clampedSecondPrev = Math.min(secondDay, daysInPrev);
		return startOfDay(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), clampedSecondPrev));
	}
}

/**
 * For a semi-monthly cycle starting at `cycleStart`, compute its end date.
 */
function semiMonthlyCycleEnd(cycleStart: Date, firstDay: number, secondDay: number): Date {
	const day = cycleStart.getDate();
	const year = cycleStart.getFullYear();
	const month = cycleStart.getMonth();
	const daysInMonth = getDaysInMonth(cycleStart);
	const clampedFirst = Math.min(firstDay, daysInMonth);
	const clampedSecond = Math.min(secondDay, daysInMonth);

	if (day === clampedFirst) {
		// First half: ends the day before the second day
		return endOfDay(new Date(year, month, clampedSecond - 1));
	} else {
		// Second half: ends the day before the first day of next month
		const nextMonth = new Date(year, month + 1, 1);
		const daysInNext = getDaysInMonth(nextMonth);
		const clampedFirstNext = Math.min(firstDay, daysInNext);
		return endOfDay(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampedFirstNext - 1));
	}
}

/**
 * Get the next semi-monthly cycle start after `currentStart`.
 */
function nextSemiMonthlyCycleStart(currentStart: Date, firstDay: number, secondDay: number): Date {
	const day = currentStart.getDate();
	const year = currentStart.getFullYear();
	const month = currentStart.getMonth();
	const daysInMonth = getDaysInMonth(currentStart);
	const clampedFirst = Math.min(firstDay, daysInMonth);

	if (day === clampedFirst) {
		// Move to second day this month
		const clampedSecond = Math.min(secondDay, daysInMonth);
		return startOfDay(new Date(year, month, clampedSecond));
	} else {
		// Move to first day of next month
		const nextMonth = new Date(year, month + 1, 1);
		const daysInNext = getDaysInMonth(nextMonth);
		const clampedFirstNext = Math.min(firstDay, daysInNext);
		return startOfDay(new Date(nextMonth.getFullYear(), nextMonth.getMonth(), clampedFirstNext));
	}
}

/**
 * Get the previous semi-monthly cycle start before `currentStart`.
 */
function prevSemiMonthlyCycleStart(currentStart: Date, firstDay: number, secondDay: number): Date {
	const day = currentStart.getDate();
	const year = currentStart.getFullYear();
	const month = currentStart.getMonth();
	const daysInMonth = getDaysInMonth(currentStart);
	const clampedSecond = Math.min(secondDay, daysInMonth);

	if (day === clampedSecond) {
		// Move to first day this month
		const clampedFirst = Math.min(firstDay, daysInMonth);
		return startOfDay(new Date(year, month, clampedFirst));
	} else {
		// Move to second day of previous month
		const prevMonth = new Date(year, month - 1, 1);
		const daysInPrev = getDaysInMonth(prevMonth);
		const clampedSecondPrev = Math.min(secondDay, daysInPrev);
		return startOfDay(new Date(prevMonth.getFullYear(), prevMonth.getMonth(), clampedSecondPrev));
	}
}

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
			startDate: startOfDay(utcDateToLocal(bill.createdAt)),
			endDate: endOfDay(utcDateToLocal(bill.dueDate))
		};
	}

	const ref = startOfDay(referenceDate);

	// Semi-monthly has its own cycle logic
	if (bill.recurrenceType === 'semi-monthly') {
		const [firstDay, secondDay] = getSemiMonthlyDays(bill);
		const cycleStart = semiMonthlyCycleStart(ref, firstDay, secondDay);
		const cycleEnd = semiMonthlyCycleEnd(cycleStart, firstDay, secondDay);
		return { startDate: cycleStart, endDate: cycleEnd };
	}

	const dueDate = startOfDay(utcDateToLocal(bill.dueDate));

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
		default:
			end = addMonths(cycleStart, 1);
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
		default:
			return addMonths(currentStart, 1);
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
		default:
			return addMonths(currentStart, -1);
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
			startDate: startOfDay(utcDateToLocal(bill.createdAt)),
			endDate: endOfDay(utcDateToLocal(bill.dueDate))
		}];
	}

	const cycles: Array<{ startDate: Date; endDate: Date }> = [];
	let currentCycle = calculateBillCycleDates(bill, startDate);

	if (bill.recurrenceType === 'semi-monthly') {
		const [firstDay, secondDay] = getSemiMonthlyDays(bill);
		while (isBefore(currentCycle.startDate, endDate) || currentCycle.startDate.getTime() === endDate.getTime()) {
			cycles.push({ ...currentCycle });
			const nextStart = nextSemiMonthlyCycleStart(currentCycle.startDate, firstDay, secondDay);
			currentCycle = {
				startDate: nextStart,
				endDate: semiMonthlyCycleEnd(nextStart, firstDay, secondDay)
			};
		}
		return cycles;
	}

	while (isBefore(currentCycle.startDate, endDate) || currentCycle.startDate.getTime() === endDate.getTime()) {
		cycles.push({ ...currentCycle });
		currentCycle = calculateBillCycleDates(
			bill,
			getNextCycleStart(bill.recurrenceType!, currentCycle.startDate)
		);
	}

	return cycles;
}


