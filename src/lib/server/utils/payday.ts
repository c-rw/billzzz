import type { PaydaySettings } from '$lib/server/db/schema';
import { addDays, addWeeks, addMonths, setDate, getDaysInMonth, startOfDay } from 'date-fns';

export type PaydayFrequency = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

/**
 * Calculate the next payday based on payday settings
 */
export function calculateNextPayday(settings: PaydaySettings, fromDate: Date = new Date()): Date {
	const now = startOfDay(fromDate);

	switch (settings.frequency) {
		case 'weekly':
			return calculateNextWeeklyPayday(now, settings.dayOfWeek!);

		case 'biweekly':
			return calculateNextBiweeklyPayday(now, settings.dayOfWeek!, settings.startDate!);

		case 'semi-monthly':
			return calculateNextSemiMonthlyPayday(now, settings.dayOfMonth!, settings.dayOfMonth2!);

		case 'monthly':
			return calculateNextMonthlyPayday(now, settings.dayOfMonth!);

		default:
			throw new Error(`Unknown payday frequency: ${settings.frequency}`);
	}
}

/**
 * Calculate the payday after the next one (for planning ahead)
 */
export function calculateFollowingPayday(settings: PaydaySettings, fromDate: Date = new Date()): Date {
	const nextPayday = calculateNextPayday(settings, fromDate);
	// Calculate the payday after the next one by starting from the day after next payday
	return calculateNextPayday(settings, addDays(nextPayday, 1));
}

/**
 * Calculate next weekly payday
 */
function calculateNextWeeklyPayday(now: Date, dayOfWeek: number): Date {
	const currentDayOfWeek = now.getDay();
	let daysUntilPayday = dayOfWeek - currentDayOfWeek;

	// If payday is today or has passed this week, get next week's payday
	if (daysUntilPayday <= 0) {
		daysUntilPayday += 7;
	}

	return addDays(now, daysUntilPayday);
}

/**
 * Calculate next biweekly payday
 */
function calculateNextBiweeklyPayday(now: Date, dayOfWeek: number, startDate: Date): Date {
	// Strip time from start date to get just the date portion
	const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	// If the start date is in the future, that's the next payday
	if (start > today) {
		return start;
	}

	// Calculate days since the start date
	const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

	// Calculate how many complete 14-day cycles have passed
	const cyclesPassed = Math.floor(daysSinceStart / 14);

	// Calculate the next payday by adding the appropriate number of cycles
	let nextPayday = addWeeks(start, cyclesPassed * 2);

	// If that date is today or in the past, move to the next cycle
	if (nextPayday <= today) {
		nextPayday = addWeeks(nextPayday, 2);
	}

	return nextPayday;
}

/**
 * Calculate next semi-monthly payday (e.g., 1st and 15th)
 */
function calculateNextSemiMonthlyPayday(now: Date, dayOfMonth1: number, dayOfMonth2: number): Date {
	const currentDay = now.getDate();
	const daysInCurrentMonth = getDaysInMonth(now);

	// Ensure days are valid for current month
	const day1 = Math.min(dayOfMonth1, daysInCurrentMonth);
	const day2 = Math.min(dayOfMonth2, daysInCurrentMonth);

	// Sort the days to know which comes first
	const [firstDay, secondDay] = [day1, day2].sort((a, b) => a - b);

	let nextPayday: Date;

	if (currentDay < firstDay) {
		// Next payday is the first day of this month
		nextPayday = setDate(now, firstDay);
	} else if (currentDay < secondDay) {
		// Next payday is the second day of this month
		nextPayday = setDate(now, secondDay);
	} else {
		// Next payday is the first day of next month
		const nextMonth = addMonths(now, 1);
		const daysInNextMonth = getDaysInMonth(nextMonth);
		const adjustedDay = Math.min(dayOfMonth1, daysInNextMonth);
		nextPayday = setDate(nextMonth, adjustedDay);
	}

	return nextPayday;
}

/**
 * Calculate next monthly payday
 */
function calculateNextMonthlyPayday(now: Date, dayOfMonth: number): Date {
	const currentDay = now.getDate();
	const daysInCurrentMonth = getDaysInMonth(now);
	const adjustedDay = Math.min(dayOfMonth, daysInCurrentMonth);

	let nextPayday: Date;

	if (currentDay < adjustedDay) {
		// Next payday is this month
		nextPayday = setDate(now, adjustedDay);
	} else {
		// Next payday is next month
		const nextMonth = addMonths(now, 1);
		const daysInNextMonth = getDaysInMonth(nextMonth);
		const adjustedNextDay = Math.min(dayOfMonth, daysInNextMonth);
		nextPayday = setDate(nextMonth, adjustedNextDay);
	}

	return nextPayday;
}

/**
 * Get a human-readable description of the payday schedule
 */
export function getPaydayDescription(settings: PaydaySettings): string {
	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	switch (settings.frequency) {
		case 'weekly':
			return `Every ${dayNames[settings.dayOfWeek!]}`;

		case 'biweekly':
			return `Every other ${dayNames[settings.dayOfWeek!]}`;

		case 'semi-monthly':
			return `${getOrdinal(settings.dayOfMonth!)} and ${getOrdinal(settings.dayOfMonth2!)} of each month`;

		case 'monthly':
			return `${getOrdinal(settings.dayOfMonth!)} of each month`;

		default:
			return 'Unknown schedule';
	}
}

/**
 * Convert number to ordinal string (1 -> 1st, 2 -> 2nd, etc.)
 */
function getOrdinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
