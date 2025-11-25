/**
 * Date utility functions to handle timezone-safe date operations
 */

/**
 * Parses a date-only string (YYYY-MM-DD) as local midnight instead of UTC midnight.
 * This prevents off-by-one day errors when working with date inputs.
 *
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Date object set to local midnight
 * @throws Error if dateString is invalid or results in an invalid Date
 *
 * @example
 * parseLocalDate('2025-01-15') // Returns Jan 15, 2025 00:00:00 in local timezone
 */
export function parseLocalDate(dateString: string): Date {
	// Validate input
	if (!dateString || typeof dateString !== 'string') {
		throw new Error(`Invalid date string: expected non-empty string, got ${typeof dateString}`);
	}

	const trimmed = dateString.trim();
	if (trimmed === '') {
		throw new Error('Invalid date string: empty string');
	}

	// Parse the date
	const parts = trimmed.split('-');
	if (parts.length !== 3) {
		throw new Error(`Invalid date format: expected YYYY-MM-DD, got "${trimmed}"`);
	}

	const [year, month, day] = parts.map(Number);

	// Check for NaN values
	if (isNaN(year) || isNaN(month) || isNaN(day)) {
		throw new Error(`Invalid date components: year=${year}, month=${month}, day=${day}`);
	}

	// Create the date
	const date = new Date(year, month - 1, day);

	// Validate that the date is valid (not Invalid Date)
	if (isNaN(date.getTime())) {
		throw new Error(`Invalid date: ${trimmed} resulted in Invalid Date`);
	}

	return date;
}

/**
 * Formats a Date object to YYYY-MM-DD in local time.
 * This is safer than using .toISOString().split('T')[0] which uses UTC.
 *
 * @param date - Date object to format
 * @returns Date string in YYYY-MM-DD format
 *
 * @example
 * formatDateForInput(new Date(2025, 0, 15)) // Returns '2025-01-15'
 */
export function formatDateForInput(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}
