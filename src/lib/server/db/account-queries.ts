import { db } from './index';
import { accounts, importedTransactions, importSessions, type NewAccount } from './schema';
import { eq, and, gt, desc, asc, sql, isNull, isNotNull, like, or } from 'drizzle-orm';

// ===== ACCOUNT QUERIES =====

/**
 * Get all accounts ordered by name
 */
export function getAllAccounts() {
	return db.select().from(accounts).orderBy(asc(accounts.name)).all();
}

/**
 * Get a single account by ID
 */
export function getAccountById(id: number) {
	return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

/**
 * Find an account by bank info (last 4 of account number + bank ID)
 * Used for OFX auto-matching on import
 */
export function getAccountByBankInfo(accountNumber: string, bankId: string) {
	return db
		.select()
		.from(accounts)
		.where(and(eq(accounts.accountNumber, accountNumber), eq(accounts.bankId, bankId)))
		.get();
}

/**
 * Create a new account
 */
export function createAccount(data: NewAccount) {
	return db.insert(accounts).values(data).returning().get();
}

/**
 * Update an existing account
 */
export function updateAccount(id: number, data: Partial<Omit<NewAccount, 'createdAt'>>) {
	return db
		.update(accounts)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(accounts.id, id))
		.returning()
		.get();
}

/**
 * Delete an account (only external accounts with no transactions should be deleted)
 */
export function deleteAccount(id: number) {
	return db.delete(accounts).where(eq(accounts.id, id)).returning().get();
}

/**
 * Calculate the running balance for an account:
 *   initialBalance + sum of imported transaction amounts after balanceAsOfDate
 *
 * If balanceAsOfDate is null, all transactions are included (original behavior).
 * If set, only transactions with datePosted > balanceAsOfDate are summed,
 * since the initialBalance already accounts for everything up to that date.
 */
export function getAccountBalance(id: number): number {
	const account = getAccountById(id);
	if (!account) return 0;

	const conditions = [
		eq(importedTransactions.ownerAccountId, id),
		eq(importedTransactions.isProcessed, true)
	];

	if (account.balanceAsOfDate) {
		conditions.push(gt(importedTransactions.datePosted, account.balanceAsOfDate));
	}

	const result = db
		.select({
			total: sql<number>`COALESCE(SUM(${importedTransactions.amount}), 0)`
		})
		.from(importedTransactions)
		.where(and(...conditions))
		.get();

	return account.initialBalance + (result?.total ?? 0);
}

/**
 * Get all accounts with their computed balances
 */
export function getAccountsWithBalances() {
	const allAccounts = getAllAccounts();

	return allAccounts.map((account) => {
		const conditions = [
			eq(importedTransactions.ownerAccountId, account.id),
			eq(importedTransactions.isProcessed, true)
		];

		if (account.balanceAsOfDate) {
			conditions.push(gt(importedTransactions.datePosted, account.balanceAsOfDate));
		}

		const result = db
			.select({
				total: sql<number>`COALESCE(SUM(${importedTransactions.amount}), 0)`
			})
			.from(importedTransactions)
			.where(and(...conditions))
			.get();

		const lastSession = db
			.select({ createdAt: importSessions.createdAt })
			.from(importSessions)
			.where(eq(importSessions.accountId, account.id))
			.orderBy(desc(importSessions.createdAt))
			.limit(1)
			.get();

		return {
			...account,
			balance: account.initialBalance + (result?.total ?? 0),
			lastImportDate: lastSession?.createdAt ?? null
		};
	});
}

/**
 * Build shared filter conditions for account transaction queries
 */
function buildTransactionConditions(
	id: number,
	options?: { search?: string; filter?: string }
) {
	const conditions = [eq(importedTransactions.ownerAccountId, id)];

	const search = options?.search?.trim();
	if (search) {
		const pattern = `%${search}%`;
		conditions.push(
			or(
				like(importedTransactions.payee, pattern),
				like(importedTransactions.memo, pattern)
			)!
		);
	}

	switch (options?.filter) {
		case 'unclassified':
			conditions.push(eq(importedTransactions.isProcessed, false));
			conditions.push(eq(importedTransactions.isTransfer, false));
			break;
		case 'buckets':
			conditions.push(isNotNull(importedTransactions.mappedBucketId));
			break;
		case 'bills':
			conditions.push(isNotNull(importedTransactions.mappedBillId));
			break;
		case 'transfers':
			conditions.push(eq(importedTransactions.isTransfer, true));
			break;
	}

	return conditions;
}

/**
 * Get paginated transactions for an account, optionally filtered by search term and status
 */
export function getAccountTransactions(
	id: number,
	options?: { limit?: number; offset?: number; search?: string; filter?: string }
) {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;
	const conditions = buildTransactionConditions(id, options);

	return db
		.select()
		.from(importedTransactions)
		.where(and(...conditions))
		.orderBy(desc(importedTransactions.datePosted))
		.limit(limit)
		.offset(offset)
		.all();
}

/**
 * Count the number of transactions belonging to an account, optionally filtered by search term and status
 */
export function getAccountTransactionCount(
	id: number,
	options?: { search?: string; filter?: string }
): number {
	const conditions = buildTransactionConditions(id, options);

	const result = db
		.select({
			count: sql<number>`COUNT(*)`
		})
		.from(importedTransactions)
		.where(and(...conditions))
		.get();

	return result?.count ?? 0;
}

/**
 * Check if an account has any transactions (used before deletion)
 */
export function accountHasTransactions(id: number): boolean {
	return getAccountTransactionCount(id) > 0;
}

/**
 * Assign all unassigned imported transactions to a given account.
 * Used during initial setup to migrate existing data to the default "Primary" account.
 */
export function assignOrphanedTransactionsToAccount(accountId: number) {
	return db
		.update(importedTransactions)
		.set({ ownerAccountId: accountId })
		.where(isNull(importedTransactions.ownerAccountId))
		.returning()
		.all();
}
