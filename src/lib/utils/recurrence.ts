import type { RecurrenceType } from '$lib/types/bill';

/**
 * Get a human-readable description of the recurrence pattern
 * This is a shared utility that can be used in both client and server code
 */
export function getRecurrenceDescription(
	recurrenceType: RecurrenceType,
	recurrenceDay?: number | null,
	recurrenceDay2?: number | null
): string {
	switch (recurrenceType) {
		case 'weekly':
			return 'Every week';
		case 'biweekly':
			return 'Every 2 weeks';
		case 'semi-monthly':
			if (recurrenceDay && recurrenceDay2) {
				return `Twice monthly on day ${recurrenceDay} & ${recurrenceDay2}`;
			}
			return 'Twice a month';
		case 'monthly':
			return recurrenceDay ? `Monthly on day ${recurrenceDay}` : 'Every month';
		case 'quarterly':
			return recurrenceDay ? `Quarterly on day ${recurrenceDay}` : 'Every 3 months';
		case 'semi-annual':
			return 'Every 6 months';
		case 'yearly':
			return 'Every year';
		default:
			return 'Unknown';
	}
}
