import type { PageServerLoad, Actions } from './$types';
import { getAnalyticsData, updateAnalyticsPreferences } from '$lib/server/db/analytics-queries';
import { getPaydaySettings } from '$lib/server/db/queries';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const analyticsData = await getAnalyticsData();
	const paydaySettingsData = getPaydaySettings();

	return {
		analytics: analyticsData,
		paydaySettings: paydaySettingsData
	};
};

export const actions: Actions = {
	updatePreferences: async ({ request }) => {
		const formData = await request.formData();
		const expectedIncomeAmount = formData.get('expectedIncomeAmount');

		try {
			await updateAnalyticsPreferences({
				expectedIncomeAmount: expectedIncomeAmount ? parseFloat(expectedIncomeAmount.toString()) : undefined
			});

			return { success: true };
		} catch (error) {
			console.error('Error updating analytics preferences:', error);
			return fail(500, { error: 'Failed to update preferences' });
		}
	}
};
