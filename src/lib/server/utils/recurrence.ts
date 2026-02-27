import { addDays, addWeeks, addMonths, addYears, setDate, getDaysInMonth } from 'date-fns';
import type { RecurrenceType } from '$lib/types/bill';

/**
 * Calculate the next due date for a recurring bill
 * @param currentDueDate The current due date
 * @param recurrenceType The type of recurrence (weekly, monthly, etc.)
 * @param recurrenceDay Optional day of month/year for monthly/yearly bills
 * @param recurrenceDay2 Optional second day of month for semi-monthly bills
 */
export function calculateNextDueDate(
	currentDueDate: Date,
	recurrenceType: RecurrenceType,
	recurrenceDay?: number | null,
	recurrenceDay2?: number | null
): Date {
	let nextDate: Date;

	switch (recurrenceType) {
		case 'weekly':
			nextDate = addWeeks(currentDueDate, 1);
			break;

		case 'biweekly':
			nextDate = addWeeks(currentDueDate, 2);
			break;

		case 'semi-monthly': {
			// Semi-monthly: two specific days per month (e.g., 1st and 15th)
			const day1 = recurrenceDay || 1;
			const day2 = recurrenceDay2 || 15;
			const [firstDay, secondDay] = day1 < day2 ? [day1, day2] : [day2, day1];

			const currentDay = currentDueDate.getDate();
			const currentMonth = currentDueDate.getMonth();
			const currentYear = currentDueDate.getFullYear();

			if (currentDay < secondDay) {
				// Move to the second day of the current month
				const daysInMonth = getDaysInMonth(currentDueDate);
				nextDate = setDate(currentDueDate, Math.min(secondDay, daysInMonth));
			} else {
				// Move to the first day of the next month
				nextDate = addMonths(currentDueDate, 1);
				const daysInMonth = getDaysInMonth(nextDate);
				nextDate = setDate(nextDate, Math.min(firstDay, daysInMonth));
			}
			break;
		}

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


