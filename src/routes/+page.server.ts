import type { PageServerLoad } from './$types';
import { getAllBills, getAllCategories, getDashboardStats } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	const bills = getAllBills();
	const categories = getAllCategories();
	const stats = getDashboardStats();

	return {
		bills,
		categories,
		stats
	};
};
