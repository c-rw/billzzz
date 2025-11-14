import type { PageServerLoad } from './$types';
import { getAllPaymentHistory, getAllCategories, getPaydaySettings } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const paymentHistory = getAllPaymentHistory();
	const categories = getAllCategories();
	const paydaySettings = getPaydaySettings();

	return {
		paymentHistory,
		categories,
		paydaySettings
	};
};
