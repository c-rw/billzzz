import type { FrequencyType } from '$lib/types/bucket';
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
 * Calculate the cycle dates for a given reference date based on frequency and anchor date
 */
export function calculateCycleDates(
	frequency: FrequencyType,
	anchorDate: Date,
	referenceDate: Date = new Date()
): { startDate: Date; endDate: Date } {
	const anchor = startOfDay(anchorDate);
	const ref = startOfDay(referenceDate);

	let cycleStart = anchor;

	// Move forward from anchor to find the cycle containing the reference date
	while (isBefore(getCycleEnd(frequency, cycleStart), ref)) {
		cycleStart = getNextCycleStart(frequency, cycleStart);
	}

	// Move backward if we've gone too far
	while (isAfter(cycleStart, ref)) {
		cycleStart = getPreviousCycleStart(frequency, cycleStart);
	}

	const cycleEnd = getCycleEnd(frequency, cycleStart);

	return {
		startDate: cycleStart,
		endDate: cycleEnd
	};
}

/**
 * Get the end date of a cycle given its start date
 */
function getCycleEnd(frequency: FrequencyType, cycleStart: Date): Date {
	let end: Date;

	switch (frequency) {
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
function getNextCycleStart(frequency: FrequencyType, currentStart: Date): Date {
	switch (frequency) {
		case 'weekly':
			return addWeeks(currentStart, 1);
		case 'biweekly':
			return addWeeks(currentStart, 2);
		case 'monthly':
			return addMonths(currentStart, 1);
		case 'quarterly':
			return addQuarters(currentStart, 1);
		case 'yearly':
			return addYears(currentStart, 1);
	}
}

/**
 * Get the start date of the previous cycle
 */
function getPreviousCycleStart(frequency: FrequencyType, currentStart: Date): Date {
	switch (frequency) {
		case 'weekly':
			return addWeeks(currentStart, -1);
		case 'biweekly':
			return addWeeks(currentStart, -2);
		case 'monthly':
			return addMonths(currentStart, -1);
		case 'quarterly':
			return addQuarters(currentStart, -1);
		case 'yearly':
			return addYears(currentStart, -1);
	}
}

/**
 * Find which cycle a timestamp belongs to
 */
export function findCycleForTimestamp(
	frequency: FrequencyType,
	anchorDate: Date,
	timestamp: Date
): { startDate: Date; endDate: Date } {
	return calculateCycleDates(frequency, anchorDate, timestamp);
}

/**
 * Generate all cycles between two dates
 */
export function generateCyclesBetween(
	frequency: FrequencyType,
	anchorDate: Date,
	startDate: Date,
	endDate: Date
): Array<{ startDate: Date; endDate: Date }> {
	const cycles: Array<{ startDate: Date; endDate: Date }> = [];
	let currentCycle = calculateCycleDates(frequency, anchorDate, startDate);

	while (isBefore(currentCycle.startDate, endDate) || currentCycle.startDate.getTime() === endDate.getTime()) {
		cycles.push({ ...currentCycle });
		currentCycle = calculateCycleDates(
			frequency,
			anchorDate,
			getNextCycleStart(frequency, currentCycle.startDate)
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
