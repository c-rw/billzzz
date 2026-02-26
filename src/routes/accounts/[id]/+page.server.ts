import type { Actions, PageServerLoad } from './$types';
import { error, fail, redirect } from '@sveltejs/kit';
import {
	getAccountById,
	getAccountBalance,
	getAccountTransactions,
	getAccountTransactionCount,
	updateAccount,
	deleteAccount,
	accountHasTransactions,
	getAllAccounts
} from '$lib/server/db/account-queries';
import { getAllTransfers, findAndLinkTransferMatch } from '$lib/server/db/transfer-queries';
import {
	getImportSession,
	getAllCategories,
	getAllBills,
	createBill,
	updateImportedTransaction,
	markBillAsPaid,
	updateBill
} from '$lib/server/db/queries';
import { getAllBucketsWithCurrentCycle, getAllBuckets, createTransaction, createBucket } from '$lib/server/db/bucket-queries';
import { createPayment } from '$lib/server/db/bill-queries';
import { parseLocalDate, utcDateToLocal } from '$lib/utils/dates';
import { calculateNextDueDate } from '$lib/server/utils/recurrence';
import { db } from '$lib/server/db/index';
import { importSessions, importedTransactions } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';

/**
 * Check if a payment date falls within the current billing cycle for a bill
 */
function isPaymentForCurrentCycle(paymentDate: Date, billDueDate: Date): boolean {
	const cycleStart = new Date(billDueDate);
	cycleStart.setDate(cycleStart.getDate() - 30);
	const cycleEnd = new Date(billDueDate);
	cycleEnd.setDate(cycleEnd.getDate() + 7);
	return paymentDate >= cycleStart && paymentDate <= cycleEnd;
}

const TRANSACTIONS_PER_PAGE = 50;

export const load: PageServerLoad = async ({ params, url }) => {
	const id = parseInt(params.id);
	if (isNaN(id)) {
		throw error(400, 'Invalid account ID');
	}

	const account = getAccountById(id);
	if (!account) {
		throw error(404, 'Account not found');
	}

	const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1') || 1);
	const search = url.searchParams.get('search') ?? '';
	const filter = url.searchParams.get('filter') ?? '';
	const offset = (page - 1) * TRANSACTIONS_PER_PAGE;

	const queryOpts = {
		search: search || undefined,
		filter: filter || undefined
	};

	const balance = getAccountBalance(id);
	const transactionCount = getAccountTransactionCount(id, queryOpts);
	const totalPages = Math.max(1, Math.ceil(transactionCount / TRANSACTIONS_PER_PAGE));
	const transactions = getAccountTransactions(id, { limit: TRANSACTIONS_PER_PAGE, offset, ...queryOpts });
	const accountTransfers = getAllTransfers({ accountId: id, limit: 20 });

	// Get import sessions for this account
	const sessions = db
		.select()
		.from(importSessions)
		.where(eq(importSessions.accountId, id))
		.orderBy(desc(importSessions.createdAt))
		.limit(10)
		.all();

	const hasTransactions = accountHasTransactions(id);

	// Data needed for transaction re-classification
	const categories = getAllCategories();
	const existingBills = getAllBills();
	const buckets = await getAllBucketsWithCurrentCycle();
	const accounts = getAllAccounts();

	return {
		account,
		balance,
		transactions,
		transactionCount,
		page,
		totalPages,
		perPage: TRANSACTIONS_PER_PAGE,
		search,
		filter,
		transfers: accountTransfers,
		importSessions: sessions,
		hasTransactions,
		categories,
		existingBills,
		buckets,
		accounts
	};
};

export const actions: Actions = {
	updateAccount: async ({ request, params }) => {
		const id = parseInt(params.id);
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		const accountType = formData.get('accountType') as string | null;
		const initialBalance = parseFloat(formData.get('initialBalance') as string);
		const balanceAsOfDateStr = formData.get('balanceAsOfDate') as string;
		// Parse as local midnight to match OFX datePosted parsing (new Date(y, m, d))
		const balanceAsOfDate = balanceAsOfDateStr
			? (() => { const [y, m, d] = balanceAsOfDateStr.split('-').map(Number); return new Date(y, m - 1, d); })()
			: null;

		if (!name) {
			return fail(400, { error: 'Account name is required' });
		}

		try {
			updateAccount(id, {
				name,
				accountType: accountType as 'checking' | 'savings' | 'credit_card' | null,
				initialBalance: isNaN(initialBalance) ? 0 : initialBalance,
				balanceAsOfDate
			});
			return { success: true };
		} catch (err) {
			console.error('Update account error:', err);
			return fail(500, { error: 'Failed to update account' });
		}
	},

	deleteAccount: async ({ params }) => {
		const id = parseInt(params.id);

		if (accountHasTransactions(id)) {
			return fail(400, { error: 'Cannot delete an account that has transactions. Remove the transactions first.' });
		}

		try {
			deleteAccount(id);
		} catch (err) {
			console.error('Delete account error:', err);
			return fail(500, { error: 'Failed to delete account' });
		}

		redirect(303, '/accounts');
	},

	updateTransactionMapping: async ({ request, params }) => {
		const accountId = parseInt(params.id);
		const formData = await request.formData();
		const mappingJson = formData.get('mapping') as string;

		if (!mappingJson) {
			return fail(400, { error: 'No mapping data provided' });
		}

		let mapping: any;
		try {
			mapping = JSON.parse(mappingJson);
		} catch {
			return fail(400, { error: 'Invalid mapping data' });
		}

		const {
			transactionId,
			action,
			billId,
			billName,
			amount,
			dueDate,
			categoryId,
			isRecurring,
			recurrenceType,
			bucketId,
			bucketName,
			budgetAmount,
			frequency,
			anchorDate,
			refundedBucketId,
			refundedBillId,
			counterpartyAccountId
		} = mapping;

		// Verify the transaction belongs to this account
		const txn = db
			.select()
			.from(importedTransactions)
			.where(eq(importedTransactions.id, transactionId))
			.get();

		if (!txn || txn.ownerAccountId !== accountId) {
			return fail(400, { error: 'Transaction not found or does not belong to this account' });
		}

		try {
			// First, reset the transaction to a clean state.
			// This allows re-classification from any previous state.
			updateImportedTransaction(transactionId, {
				mappedBillId: null,
				mappedBucketId: null,
				createNewBill: false,
				isIncome: false,
				isRefund: false,
				refundedBucketId: null,
				refundedBillId: null,
				isTransfer: false,
				counterpartyAccountId: null,
				isProcessed: false
			});

			if (action === 'skip') {
				// Leave the transaction reset (unprocessed)
				return { mappingSuccess: true, transactionId };
			}

			if (action === 'map_existing' && billId) {
				const existingBills = getAllBills();
				const existingBill = existingBills.find(b => b.id === billId);

				await createPayment({
					billId,
					amount,
					paymentDate: txn.datePosted,
					notes: 'Payment recorded from account reclassification'
				});

				if (existingBill && isPaymentForCurrentCycle(txn.datePosted, existingBill.dueDate)) {
					markBillAsPaid(billId, true);

					if (existingBill.isRecurring && existingBill.recurrenceType) {
						const nextDueDate = calculateNextDueDate(
							existingBill.dueDate,
							existingBill.recurrenceType as any,
							existingBill.recurrenceDay
						);
						updateBill(billId, { isPaid: false, dueDate: nextDueDate });
					}
				}

				updateImportedTransaction(transactionId, {
					mappedBillId: billId,
					isProcessed: true
				});
			} else if (action === 'create_new' && billName) {
				let billDueDate: Date;
				try {
					if (!dueDate || (typeof dueDate === 'string' && dueDate.trim() === '')) {
						billDueDate = txn.datePosted;
					} else {
						billDueDate = parseLocalDate(dueDate);
					}
				} catch {
					billDueDate = txn.datePosted;
				}

				// Default recurrenceType to 'monthly' when isRecurring is true but no type provided
				const effectiveRecurrenceType = isRecurring ? (recurrenceType || 'monthly') : null;

				const shouldMarkAsPaid = isPaymentForCurrentCycle(txn.datePosted, billDueDate);

				const newBill = createBill({
					name: billName,
					amount,
					dueDate: billDueDate,
					categoryId: categoryId || null,
					isRecurring: isRecurring || false,
					recurrenceType: effectiveRecurrenceType,
					recurrenceDay: (isRecurring && (effectiveRecurrenceType === 'monthly' || effectiveRecurrenceType === 'quarterly'))
						? utcDateToLocal(billDueDate).getDate()
						: null,
					isPaid: shouldMarkAsPaid,
					isAutopay: false,
					notes: null,
					paymentLink: null
				});

				await createPayment({
					billId: newBill.id,
					amount,
					paymentDate: txn.datePosted,
					notes: 'Payment recorded from account reclassification'
				});

				if (shouldMarkAsPaid && isRecurring) {
					const nextDueDate = calculateNextDueDate(
						billDueDate,
						(effectiveRecurrenceType || 'monthly') as any,
						utcDateToLocal(billDueDate).getDate()
					);
					updateBill(newBill.id, { isPaid: false, dueDate: nextDueDate });
				}

				updateImportedTransaction(transactionId, {
					mappedBillId: newBill.id,
					createNewBill: true,
					isProcessed: true
				});
			} else if (action === 'map_to_bucket' && bucketId) {
				await createTransaction({
					bucketId,
					amount,
					timestamp: txn.datePosted,
					vendor: txn.payee,
					notes: txn.memo || undefined
				});

				updateImportedTransaction(transactionId, {
					mappedBucketId: bucketId,
					isProcessed: true
				});
			} else if (action === 'create_new_bucket' && bucketName) {
				let bucketAnchorDate: Date;
				try {
					if (anchorDate && typeof anchorDate === 'string' && anchorDate.trim() !== '') {
						bucketAnchorDate = parseLocalDate(anchorDate);
					} else {
						bucketAnchorDate = txn.datePosted;
					}
				} catch {
					bucketAnchorDate = txn.datePosted;
				}

				const newBucket = await createBucket({
					name: bucketName,
					frequency: frequency || 'monthly',
					budgetAmount: budgetAmount || amount,
					anchorDate: bucketAnchorDate,
					enableCarryover: true,
					icon: 'shopping-cart',
					color: null
				});

				await createTransaction({
					bucketId: newBucket.id,
					amount,
					timestamp: txn.datePosted,
					vendor: txn.payee,
					notes: txn.memo || undefined
				});

				updateImportedTransaction(transactionId, {
					mappedBucketId: newBucket.id,
					createNewBill: false,
					isProcessed: true
				});
			} else if (action === 'mark_income') {
				updateImportedTransaction(transactionId, {
					isIncome: true,
					isProcessed: true
				});
			} else if (action === 'mark_refund') {
				if (refundedBucketId) {
					await createTransaction({
						bucketId: refundedBucketId,
						amount: -Math.abs(txn.amount),
						timestamp: txn.datePosted,
						vendor: txn.payee,
						notes: `Refund: ${txn.memo || txn.payee}`
					});

					updateImportedTransaction(transactionId, {
						isRefund: true,
						refundedBucketId,
						mappedBucketId: refundedBucketId,
						isProcessed: true
					});
				} else if (refundedBillId) {
					await createPayment({
						billId: refundedBillId,
						amount: -Math.abs(txn.amount),
						paymentDate: txn.datePosted,
						notes: `Refund: ${txn.memo || txn.payee}`
					});

					updateImportedTransaction(transactionId, {
						isRefund: true,
						refundedBillId,
						mappedBillId: refundedBillId,
						isProcessed: true
					});
				}
			} else if (action === 'mark_transfer') {
				// Try to auto-match and link the other side of the transfer
				if (counterpartyAccountId) {
					const linked = findAndLinkTransferMatch(transactionId, counterpartyAccountId);
					if (!linked) {
						// No unique match found — mark just this side
						updateImportedTransaction(transactionId, {
							isTransfer: true,
							counterpartyAccountId: counterpartyAccountId,
							isProcessed: true
						});
					}
					// If linked, findAndLinkTransferMatch already marked both sides
				} else {
					// No counterparty selected — mark just this side
					updateImportedTransaction(transactionId, {
						isTransfer: true,
						counterpartyAccountId: null,
						isProcessed: true
					});
				}
			}

			return { mappingSuccess: true, transactionId };
		} catch (err) {
			console.error('Update transaction mapping error:', err);
			return fail(500, { error: 'Failed to update transaction mapping' });
		}
	}
};
