import type { PageServerLoad } from './$types';
import {
	getBucketWithCurrentCycle,
	getTransactionsForBucket,
	getCyclesForBucket,
	getAllocationsForBucket
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
	const allocations = await getAllocationsForBucket(id);

	return {
		bucket,
		transactions,
		cycles,
		allocations
	};
};
