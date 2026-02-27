import { db } from './index';
import {
	transfers,
	importedTransactions,
	accounts
} from './schema';
import { eq, and, sql, desc } from 'drizzle-orm';

// ===== TRANSFER DETECTION & MANAGEMENT =====

/**
 * Get all pending transfers, joined with transaction and account details.
 */
export function getPendingTransfers() {
	// Aliases for the two account sides
	const fromAccount = db
		.select({
			id: accounts.id,
			name: accounts.name,
			accountType: accounts.accountType
		})
		.from(accounts)
		.as('from_account');

	const toAccount = db
		.select({
			id: accounts.id,
			name: accounts.name,
			accountType: accounts.accountType
		})
		.from(accounts)
		.as('to_account');

	// Use raw SQL joins for clarity since we need two account joins
	const results = db
		.select({
			transfer: transfers,
			fromTransaction: {
				id: importedTransactions.id,
				payee: importedTransactions.payee,
				amount: importedTransactions.amount,
				datePosted: importedTransactions.datePosted,
				transactionType: importedTransactions.transactionType
			}
		})
		.from(transfers)
		.innerJoin(importedTransactions, eq(transfers.fromTransactionId, importedTransactions.id))
		.where(eq(transfers.status, 'pending'))
		.orderBy(desc(transfers.detectedAt))
		.all();

	// Enrich with account names and to-transaction details
	return results.map((row) => {
		const fromAcct = db
			.select({ name: accounts.name, accountType: accounts.accountType })
			.from(accounts)
			.where(eq(accounts.id, row.transfer.fromAccountId))
			.get();

		const toAcct = db
			.select({ name: accounts.name, accountType: accounts.accountType })
			.from(accounts)
			.where(eq(accounts.id, row.transfer.toAccountId))
			.get();

		const toTxn = db
			.select({
				id: importedTransactions.id,
				payee: importedTransactions.payee,
				amount: importedTransactions.amount,
				datePosted: importedTransactions.datePosted,
				transactionType: importedTransactions.transactionType
			})
			.from(importedTransactions)
			.where(eq(importedTransactions.id, row.transfer.toTransactionId))
			.get();

		return {
			...row.transfer,
			fromAccount: fromAcct ?? { name: 'Unknown', accountType: null },
			toAccount: toAcct ?? { name: 'Unknown', accountType: null },
			fromTransaction: row.fromTransaction,
			toTransaction: toTxn ?? null
		};
	});
}

/**
 * Get all transfers with optional filtering by status and/or account.
 */
export function getAllTransfers(options?: {
	status?: 'pending' | 'confirmed' | 'rejected';
	accountId?: number;
	limit?: number;
	offset?: number;
}) {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const conditions = [];
	if (options?.status) {
		conditions.push(eq(transfers.status, options.status));
	}
	if (options?.accountId) {
		conditions.push(
			sql`(${transfers.fromAccountId} = ${options.accountId} OR ${transfers.toAccountId} = ${options.accountId})`
		);
	}

	const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

	const results = db
		.select({
			transfer: transfers,
			fromTransaction: {
				id: importedTransactions.id,
				payee: importedTransactions.payee,
				amount: importedTransactions.amount,
				datePosted: importedTransactions.datePosted,
				transactionType: importedTransactions.transactionType
			}
		})
		.from(transfers)
		.innerJoin(importedTransactions, eq(transfers.fromTransactionId, importedTransactions.id))
		.where(whereClause)
		.orderBy(desc(transfers.detectedAt))
		.limit(limit)
		.offset(offset)
		.all();

	return results.map((row) => {
		const fromAcct = db
			.select({ name: accounts.name, accountType: accounts.accountType })
			.from(accounts)
			.where(eq(accounts.id, row.transfer.fromAccountId))
			.get();

		const toAcct = db
			.select({ name: accounts.name, accountType: accounts.accountType })
			.from(accounts)
			.where(eq(accounts.id, row.transfer.toAccountId))
			.get();

		const toTxn = db
			.select({
				id: importedTransactions.id,
				payee: importedTransactions.payee,
				amount: importedTransactions.amount,
				datePosted: importedTransactions.datePosted,
				transactionType: importedTransactions.transactionType
			})
			.from(importedTransactions)
			.where(eq(importedTransactions.id, row.transfer.toTransactionId))
			.get();

		return {
			...row.transfer,
			fromAccount: fromAcct ?? { name: 'Unknown', accountType: null },
			toAccount: toAcct ?? { name: 'Unknown', accountType: null },
			fromTransaction: row.fromTransaction,
			toTransaction: toTxn ?? null
		};
	});
}

/**
 * Confirm a pending transfer:
 * 1. Update transfer status to 'confirmed' and set confirmedAt
 * 2. Mark both imported_transactions as isTransfer = true
 * 3. Set counterpartyAccountId on both transactions
 */
export function confirmTransfer(transferId: number) {
	const transfer = db
		.select()
		.from(transfers)
		.where(eq(transfers.id, transferId))
		.get();

	if (!transfer) return null;

	// Update transfer status
	const updated = db
		.update(transfers)
		.set({
			status: 'confirmed' as const,
			confirmedAt: new Date()
		})
		.where(eq(transfers.id, transferId))
		.returning()
		.get();

	// Mark both transactions as transfers and set counterparty accounts
	db.update(importedTransactions)
		.set({
			isTransfer: true,
			counterpartyAccountId: transfer.toAccountId,
			isProcessed: true
		})
		.where(eq(importedTransactions.id, transfer.fromTransactionId))
		.run();

	db.update(importedTransactions)
		.set({
			isTransfer: true,
			counterpartyAccountId: transfer.fromAccountId,
			isProcessed: true
		})
		.where(eq(importedTransactions.id, transfer.toTransactionId))
		.run();

	return updated;
}

/**
 * Reject a pending transfer.
 * The transactions remain as-is and can be mapped to bills/buckets normally.
 */
export function rejectTransfer(transferId: number) {
	return db
		.update(transfers)
		.set({ status: 'rejected' as const })
		.where(eq(transfers.id, transferId))
		.returning()
		.get();
}

/**
 * When a user manually marks a transaction as a transfer and selects a
 * counterparty account, search that account for a matching transaction
 * (same amount, opposite direction, within 7 days) and link both sides.
 *
 * Returns the created transfer record if a match is found, or null if
 * no unique match exists (in which case the caller should still mark
 * the single transaction as a transfer without a link).
 */
export function findAndLinkTransferMatch(
	transactionId: number,
	counterpartyAccountId: number
): typeof transfers.$inferSelect | null {
	const txn = db
		.select()
		.from(importedTransactions)
		.where(eq(importedTransactions.id, transactionId))
		.get();

	if (!txn) return null;

	const isDebit = txn.transactionType === 'DEBIT' || txn.transactionType === 'XFER';
	const isCredit = txn.transactionType === 'CREDIT';
	if (!isDebit && !isCredit) return null;

	const SEVEN_DAYS_SECONDS = 7 * 24 * 60 * 60;
	const txnTimestamp = Math.floor(txn.datePosted.getTime() / 1000);
	const windowStart = txnTimestamp - SEVEN_DAYS_SECONDS;
	const windowEnd = txnTimestamp + SEVEN_DAYS_SECONDS;

	// Find matching transactions in the counterparty account:
	// same absolute amount, opposite direction, within 7-day window, not already a transfer
	const candidates = db
		.select()
		.from(importedTransactions)
		.where(
			and(
				eq(importedTransactions.ownerAccountId, counterpartyAccountId),
				eq(importedTransactions.amount, txn.amount),
				eq(importedTransactions.isTransfer, false),
				sql`${importedTransactions.datePosted} BETWEEN ${windowStart} AND ${windowEnd}`,
				isDebit
					? eq(importedTransactions.transactionType, 'CREDIT')
					: sql`${importedTransactions.transactionType} IN ('DEBIT', 'XFER')`
			)
		)
		.all();

	// Only auto-link if exactly one match is found (avoid ambiguity)
	if (candidates.length !== 1) return null;

	const match = candidates[0];

	// Check no transfer record already exists for this pair
	const existingTransfer = db
		.select()
		.from(transfers)
		.where(
			sql`(${transfers.fromTransactionId} = ${txn.id} AND ${transfers.toTransactionId} = ${match.id})
			 OR (${transfers.fromTransactionId} = ${match.id} AND ${transfers.toTransactionId} = ${txn.id})`
		)
		.get();

	if (existingTransfer) return existingTransfer;

	// Determine from/to: "from" is the DEBIT side, "to" is the CREDIT side
	const fromTxn = isDebit ? txn : match;
	const toTxn = isDebit ? match : txn;

	// Create the transfer record as confirmed (user explicitly chose this)
	const transfer = db
		.insert(transfers)
		.values({
			fromTransactionId: fromTxn.id,
			toTransactionId: toTxn.id,
			fromAccountId: fromTxn.ownerAccountId!,
			toAccountId: toTxn.ownerAccountId!,
			amount: txn.amount,
			status: 'confirmed',
			confirmedAt: new Date()
		})
		.returning()
		.get();

	// Mark BOTH transactions as transfers with counterparty info
	db.update(importedTransactions)
		.set({
			isTransfer: true,
			counterpartyAccountId: toTxn.ownerAccountId,
			isProcessed: true
		})
		.where(eq(importedTransactions.id, fromTxn.id))
		.run();

	db.update(importedTransactions)
		.set({
			isTransfer: true,
			counterpartyAccountId: fromTxn.ownerAccountId,
			isProcessed: true
		})
		.where(eq(importedTransactions.id, toTxn.id))
		.run();

	return transfer;
}
