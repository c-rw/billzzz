import { parseLocalDate } from '$lib/utils/dates';
import type { Actions, PageServerLoad } from './$types';
import { fail } from '@sveltejs/kit';
import { getAccountsWithBalances, createAccount, deleteAccount, accountHasTransactions } from '$lib/server/db/account-queries';
import { getPendingTransfers, getAllTransfers, confirmTransfer, rejectTransfer } from '$lib/server/db/transfer-queries';

export const load: PageServerLoad = async ({ url }) => {
	const accounts = getAccountsWithBalances();
	const pendingTransfers = getPendingTransfers();
	const recentTransfers = getAllTransfers({ status: 'confirmed', limit: 20 });
	const reviewTransfers = url.searchParams.get('reviewTransfers') === 'true';

	return {
		accounts,
		pendingTransfers,
		recentTransfers,
		reviewTransfers
	};
};

export const actions: Actions = {
	confirmTransfer: async ({ request }) => {
		const formData = await request.formData();
		const transferId = parseInt(formData.get('transferId') as string);

		if (!transferId || isNaN(transferId)) {
			return fail(400, { error: 'Invalid transfer ID' });
		}

		const result = confirmTransfer(transferId);
		if (!result) {
			return fail(404, { error: 'Transfer not found' });
		}

		return { success: true };
	},

	rejectTransfer: async ({ request }) => {
		const formData = await request.formData();
		const transferId = parseInt(formData.get('transferId') as string);

		if (!transferId || isNaN(transferId)) {
			return fail(400, { error: 'Invalid transfer ID' });
		}

		const result = rejectTransfer(transferId);
		if (!result) {
			return fail(404, { error: 'Transfer not found' });
		}

		return { success: true };
	},

	createAccount: async ({ request }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const accountType = (formData.get('accountType') as string) || 'checking';
		const isExternal = formData.get('isExternal') === 'on';
		const initialBalance = parseFloat(formData.get('initialBalance') as string) || 0;
		const balanceAsOfDateStr = formData.get('balanceAsOfDate') as string;
		// Parse as UTC midnight — consistent with the localDate schema type
		const balanceAsOfDate = balanceAsOfDateStr
			? parseLocalDate(balanceAsOfDateStr)
			: null;

		if (!name) {
			return fail(400, { error: 'Account name is required' });
		}

		try {
			createAccount({
				name,
				accountType: accountType as 'checking' | 'savings' | 'credit_card',
				isExternal,
				initialBalance,
				balanceAsOfDate,
				accountNumber: null,
				bankId: null
			});
			return { success: true };
		} catch (error) {
			console.error('Create account error:', error);
			return fail(500, { error: 'Failed to create account' });
		}
	},

	deleteAccount: async ({ request }) => {
		const formData = await request.formData();
		const accountId = parseInt(formData.get('accountId') as string);

		if (!accountId || isNaN(accountId)) {
			return fail(400, { error: 'Invalid account ID' });
		}

		if (accountHasTransactions(accountId)) {
			return fail(400, { error: 'Cannot delete an account that has transactions. Remove the transactions first.' });
		}

		try {
			deleteAccount(accountId);
			return { success: true };
		} catch (error) {
			console.error('Delete account error:', error);
			return fail(500, { error: 'Failed to delete account' });
		}
	}
};
