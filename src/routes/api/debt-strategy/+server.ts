import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStrategySettings, updateStrategySettings } from '$lib/server/db/debt-queries';

export const GET: RequestHandler = async () => {
	try {
		const settings = getStrategySettings();
		return json(settings);
	} catch (error) {
		console.error('Error fetching strategy settings:', error);
		return json({ error: 'Failed to fetch strategy settings' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validation
		if (data.strategy && !['snowball', 'avalanche', 'custom'].includes(data.strategy)) {
			return json({ error: 'Invalid strategy type' }, { status: 400 });
		}

		if (
			data.extraMonthlyPayment !== undefined &&
			(typeof data.extraMonthlyPayment !== 'number' || data.extraMonthlyPayment < 0)
		) {
			return json({ error: 'Extra monthly payment must be non-negative' }, { status: 400 });
		}

		const settings = updateStrategySettings({
			...(data.strategy && { strategy: data.strategy }),
			...(data.extraMonthlyPayment !== undefined && {
				extraMonthlyPayment: data.extraMonthlyPayment
			}),
			...(data.customPriorityOrder !== undefined && {
				customPriorityOrder: data.customPriorityOrder ? JSON.stringify(data.customPriorityOrder) : null
			})
		});

		return json(settings);
	} catch (error) {
		console.error('Error updating strategy settings:', error);
		return json({ error: 'Failed to update strategy settings' }, { status: 500 });
	}
};
