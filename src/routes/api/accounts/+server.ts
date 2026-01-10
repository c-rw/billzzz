import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllAccounts, createAccount } from '$lib/server/db/queries';

// GET /api/accounts - Get all accounts
export const GET: RequestHandler = async () => {
	try {
		const accounts = getAllAccounts();
		return json(accounts);
	} catch (error) {
		console.error('Error fetching accounts:', error);
		return json({ error: 'Failed to fetch accounts' }, { status: 500 });
	}
};

// POST /api/accounts - Create a new account
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		if (!data.name || typeof data.name !== 'string') {
			return json({ error: 'Missing required field: name' }, { status: 400 });
		}

		const account = createAccount({
			name: data.name,
			isExternal: Boolean(data.isExternal)
		});

		return json(account);
	} catch (error) {
		console.error('Error creating account:', error);
		return json({ error: 'Failed to create account' }, { status: 500 });
	}
};
