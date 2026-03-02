import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getBucketWithCurrentCycle,
	updateBucket,
	deleteBucket
} from '$lib/server/db/bucket-queries';
import { parseDateString } from '$lib/utils/dates';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const bucket = await getBucketWithCurrentCycle(id);

		if (!bucket) {
			return json({ error: 'Bucket not found' }, { status: 404 });
		}

		return json(bucket);
	} catch (error) {
		console.error('Error fetching bucket:', error);
		return json({ error: 'Failed to fetch bucket' }, { status: 500 });
	}
};

async function handleUpdate(params: { id: string }, request: Request) {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		if (data.anchorDate) {
			try {
				data.anchorDate = parseDateString(data.anchorDate);
			} catch (error) {
				return json({ error: 'Invalid anchor date format. Expected YYYY-MM-DD or ISO timestamp' }, { status: 400 });
			}
		}

		const bucket = await updateBucket(id, data);

		if (!bucket) {
			return json({ error: 'Bucket not found' }, { status: 404 });
		}

		return json(bucket);
	} catch (error) {
		console.error('Error updating bucket:', error);
		return json({ error: 'Failed to update bucket' }, { status: 500 });
	}
}

export const PUT: RequestHandler = ({ params, request }) => handleUpdate(params, request);
export const PATCH: RequestHandler = ({ params, request }) => handleUpdate(params, request);

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		await deleteBucket(id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting bucket:', error);
		return json({ error: 'Failed to delete bucket' }, { status: 500 });
	}
};
