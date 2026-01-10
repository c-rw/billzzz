import type { PageServerLoad } from './$types';
import { getAllAccounts } from '$lib/server/db/queries';

export const load: PageServerLoad = async () => {
	return {
		accounts: getAllAccounts()
	};
};
