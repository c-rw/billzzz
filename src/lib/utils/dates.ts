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
	const date = new Date(Date.UTC(year, month - 1, day));

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

/**
 * Converts a UTC-midnight Date (as stored in the DB) to a local-midnight Date
 * representing the same calendar day.
 *
 * The DB stores all dates as UTC midnight (e.g. 2025-02-12T00:00:00Z). In
 * negative-UTC timezones (all US zones) that instant is the previous evening
 * locally, so every date-fns function that operates in local time would read
 * the wrong calendar day. Reading the UTC components and rebuilding the Date
 * at local midnight fixes this for all downstream consumers.
 *
 * @param date - A Date object whose UTC date components represent the intended calendar day
 * @returns A new Date set to local midnight of that same calendar day
 *
 * @example
 * // DB returns 2025-02-12T00:00:00Z; in UTC-5 that is Feb 11 locally.
 * utcDateToLocal(dbDate) // => Feb 12 00:00:00 local time
 */
export function utcDateToLocal(date: Date): Date {
	return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/**
 * Formats a Date (or date string or null) as a localized short date string.
 * Safe for DB Date objects — converts UTC midnight to local midnight before formatting.
 *
 * @param date - A Date, ISO string, or null/undefined
 * @param fallback - String to return when date is null/undefined (default '—')
 * @returns Formatted string like "Jan 15, 2025" or the fallback
 *
 * @example
 * formatDate(account.lastImportDate, 'Never') // => "Jan 15, 2025" or "Never"
 * formatDate(txn.datePosted, 'N/A')           // => "Feb 12, 2025" or "N/A"
 */
/**
 * Parses a date string in either YYYY-MM-DD or ISO timestamp format to local midnight.
 * Handles both "2025-01-15" and "2025-01-15T06:00:00.000Z" formats.
 */
export function parseDateString(value: string): Date {
	if (value.includes('T')) {
		return parseLocalDate(value.split('T')[0]);
	}
	return parseLocalDate(value);
}

export function formatDate(date: Date | string | null | undefined, fallback = '—'): string {
	if (!date) return fallback;
	const d = date instanceof Date ? date : new Date(date);
	return utcDateToLocal(d).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric'
	});
}


