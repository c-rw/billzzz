import { addDays, addWeeks, addMonths, addYears, setDate, getDaysInMonth } from 'date-fns';
import type { RecurrenceType } from '$lib/types/bill';

// Re-export shared utility
export { getRecurrenceDescription } from '$lib/utils/recurrence';

/**
 * Calculate the next due date for a recurring bill
 * @param currentDueDate The current due date
 * @param recurrenceType The type of recurrence (weekly, monthly, etc.)
 * @param recurrenceDay Optional day of month/year for monthly/yearly bills
 */
export function calculateNextDueDate(
	currentDueDate: Date,
	recurrenceType: RecurrenceType,
	recurrenceDay?: number | null
): Date {
	let nextDate: Date;

	switch (recurrenceType) {
		case 'weekly':
			nextDate = addWeeks(currentDueDate, 1);
			break;

		case 'biweekly':
			nextDate = addWeeks(currentDueDate, 2);
			break;

		case 'monthly':
			// If a specific day is set, use that day; otherwise increment by month
			if (recurrenceDay) {
				nextDate = addMonths(currentDueDate, 1);
				const daysInMonth = getDaysInMonth(nextDate);
				// Handle months with fewer days (e.g., setting to 31st in February)
				const dayToSet = Math.min(recurrenceDay, daysInMonth);
				nextDate = setDate(nextDate, dayToSet);
			} else {
				nextDate = addMonths(currentDueDate, 1);
			}
			break;

		case 'quarterly':
			if (recurrenceDay) {
				nextDate = addMonths(currentDueDate, 3);
				const daysInMonth = getDaysInMonth(nextDate);
				const dayToSet = Math.min(recurrenceDay, daysInMonth);
				nextDate = setDate(nextDate, dayToSet);
			} else {
				nextDate = addMonths(currentDueDate, 3);
			}
			break;

		case 'semi-annual':
			nextDate = addMonths(currentDueDate, 6);
			break;

		case 'yearly':
			nextDate = addYears(currentDueDate, 1);
			break;

		default:
			throw new Error(`Unknown recurrence type: ${recurrenceType}`);
	}

	return nextDate;
}

/**
 * Check if a bill's due date has passed and it needs to be updated
 */
export function shouldUpdateRecurringBill(dueDate: Date, isPaid: boolean): boolean {
	const now = new Date();
	return isPaid && dueDate < now;
}
