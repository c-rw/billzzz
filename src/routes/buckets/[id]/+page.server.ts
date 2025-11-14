import type { PageServerLoad } from './$types';
import {
	getBucketWithCurrentCycle,
	getTransactionsForBucket,
	getCyclesForBucket
} from '$lib/server/db/bucket-queries';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params }) => {
	const id = parseInt(params.id);

	const bucket = await getBucketWithCurrentCycle(id);

	if (!bucket) {
		throw error(404, 'Bucket not found');
	}

	const transactions = await getTransactionsForBucket(id);
	const cycles = await getCyclesForBucket(id);

	return {
		bucket,
		transactions,
		cycles
	};
};
