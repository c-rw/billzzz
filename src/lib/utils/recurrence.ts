import type { RecurrenceType } from '$lib/types/bill';

/**
 * Get a human-readable description of the recurrence pattern
 * This is a shared utility that can be used in both client and server code
 */
export function getRecurrenceDescription(
	recurrenceType: RecurrenceType,
	recurrenceDay?: number | null
): string {
	switch (recurrenceType) {
		case 'weekly':
			return 'Every week';
		case 'biweekly':
			return 'Every 2 weeks';
		case 'monthly':
			return recurrenceDay ? `Monthly on day ${recurrenceDay}` : 'Every month';
		case 'quarterly':
			return recurrenceDay ? `Quarterly on day ${recurrenceDay}` : 'Every 3 months';
		case 'yearly':
			return 'Every year';
		default:
			return 'Unknown';
	}
}
