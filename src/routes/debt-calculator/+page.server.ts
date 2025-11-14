import type { PageServerLoad } from './$types';
import { getDebtsWithDetails, getStrategySettings } from '$lib/server/db/debt-queries';
import { getAllBills } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const debts = getDebtsWithDetails();
	const strategySettings = getStrategySettings();
	const bills = getAllBills();

	// Parse custom priority order if exists
	let customPriorityOrder: number[] = [];
	if (strategySettings.customPriorityOrder) {
		try {
			customPriorityOrder = JSON.parse(strategySettings.customPriorityOrder);
		} catch (e) {
			console.error('Failed to parse custom priority order:', e);
		}
	}

	return {
		debts,
		bills,
		strategySettings: {
			...strategySettings,
			customPriorityOrder
		}
	};
};
