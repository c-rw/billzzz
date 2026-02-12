import { addDays, addWeeks, addMonths, setDate, getDaysInMonth, startOfDay } from 'date-fns';

export type PaydayFrequency = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

// Minimal shape — matches the DB schema but lives in a client-safe module
export interface PaydaySettingsLike {
	frequency: PaydayFrequency;
	dayOfWeek?: number | null;
	dayOfMonth?: number | null;
	dayOfMonth2?: number | null;
	startDate?: Date | null;
}

/**
 * Calculate the next payday based on payday settings
 */
export function calculateNextPayday(settings: PaydaySettingsLike, fromDate: Date = new Date()): Date {
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
export function calculateFollowingPayday(settings: PaydaySettingsLike, fromDate: Date = new Date()): Date {
	const nextPayday = calculateNextPayday(settings, fromDate);
	return calculateNextPayday(settings, addDays(nextPayday, 1));
}

function calculateNextWeeklyPayday(now: Date, dayOfWeek: number): Date {
	const currentDayOfWeek = now.getDay();
	let daysUntilPayday = dayOfWeek - currentDayOfWeek;
	if (daysUntilPayday <= 0) daysUntilPayday += 7;
	return addDays(now, daysUntilPayday);
}

function calculateNextBiweeklyPayday(now: Date, _dayOfWeek: number, startDate: Date): Date {
	const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

	if (start > today) return start;

	const daysSinceStart = Math.floor((today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
	const cyclesPassed = Math.floor(daysSinceStart / 14);
	let nextPayday = addWeeks(start, cyclesPassed * 2);

	if (nextPayday <= today) nextPayday = addWeeks(nextPayday, 2);

	return nextPayday;
}

function calculateNextSemiMonthlyPayday(now: Date, dayOfMonth1: number, dayOfMonth2: number): Date {
	const currentDay = now.getDate();
	const daysInCurrentMonth = getDaysInMonth(now);

	const day1 = Math.min(dayOfMonth1, daysInCurrentMonth);
	const day2 = Math.min(dayOfMonth2, daysInCurrentMonth);
	const [firstDay, secondDay] = [day1, day2].sort((a, b) => a - b);

	if (currentDay < firstDay) return setDate(now, firstDay);
	if (currentDay < secondDay) return setDate(now, secondDay);

	const nextMonth = addMonths(now, 1);
	return setDate(nextMonth, Math.min(dayOfMonth1, getDaysInMonth(nextMonth)));
}

function calculateNextMonthlyPayday(now: Date, dayOfMonth: number): Date {
	const currentDay = now.getDate();
	const adjustedDay = Math.min(dayOfMonth, getDaysInMonth(now));

	if (currentDay < adjustedDay) return setDate(now, adjustedDay);

	const nextMonth = addMonths(now, 1);
	return setDate(nextMonth, Math.min(dayOfMonth, getDaysInMonth(nextMonth)));
}

/**
 * How many days until a given date from today
 */
export function daysUntil(date: Date, from: Date = new Date()): number {
	return Math.ceil((startOfDay(date).getTime() - startOfDay(from).getTime()) / (1000 * 60 * 60 * 24));
}
