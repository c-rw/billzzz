import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getBucketWithCurrentCycle,
	updateBucket,
	deleteBucket
} from '$lib/server/db/bucket-queries';

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

export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Convert date string to Date object if present
		if (data.anchorDate) {
			data.anchorDate = new Date(data.anchorDate);
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
};

export const PATCH: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		// Convert date string to Date object if present
		if (data.anchorDate) {
			data.anchorDate = new Date(data.anchorDate);
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
};

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
