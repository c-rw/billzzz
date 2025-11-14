import type { PageServerLoad } from './$types';
import { getAllBucketsWithCurrentCycle } from '$lib/server/db/bucket-queries';

export const load: PageServerLoad = async () => {
	const buckets = await getAllBucketsWithCurrentCycle();

	return {
		buckets
	};
};
