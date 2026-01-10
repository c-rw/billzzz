import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAccountById, updateAccount, deleteAccount } from '$lib/server/db/queries';

// GET /api/accounts/[id] - Get a single account
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = Number.parseInt(params.id);
		const account = getAccountById(id);

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		return json(account);
	} catch (error) {
		console.error('Error fetching account:', error);
		return json({ error: 'Failed to fetch account' }, { status: 500 });
	}
};

// PUT /api/accounts/[id] - Update an account
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = Number.parseInt(params.id);
		const data = await request.json();

		const updateData: any = {
			name: data.name,
			isExternal: data.isExternal
		};

		Object.keys(updateData).forEach(
			(key) => updateData[key] === undefined && delete updateData[key]
		);

		const account = updateAccount(id, updateData);

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		return json(account);
	} catch (error) {
		console.error('Error updating account:', error);
		return json({ error: 'Failed to update account' }, { status: 500 });
	}
};

// DELETE /api/accounts/[id] - Delete an account
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = Number.parseInt(params.id);
		const account = deleteAccount(id);

		if (!account) {
			return json({ error: 'Account not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting account:', error);
		return json({ error: 'Failed to delete account' }, { status: 500 });
	}
};
