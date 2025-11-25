import type { PageServerLoad } from './$types';
import { getAllCategories, getDashboardStats } from '$lib/server/db/queries';
import { getAllBillsWithCurrentCycle } from '$lib/server/db/bill-queries';

export const load: PageServerLoad = async () => {
	const bills = await getAllBillsWithCurrentCycle();
	const categories = getAllCategories();
	const stats = getDashboardStats();

	return {
		bills,
		categories,
		stats
	};
};
