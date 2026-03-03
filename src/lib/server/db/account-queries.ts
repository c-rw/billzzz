import { db } from './index';
import { accounts, importedTransactions, importSessions, type NewAccount } from './schema';
import { eq, and, gt, desc, asc, sql, isNull, isNotNull, like, or } from 'drizzle-orm';

// ===== ACCOUNT QUERIES =====

/**
 * Build the signed-amount SQL expression for balance calculation.
 *
 * For bank accounts: CREDIT = deposit (positive), all else = negative.
 * For credit cards:  CREDIT (refund) and PAYMENT (payment to card) = positive (reduces debt);
 *                    DEBIT, FEE, INT, SRVCHG etc. = negative (increases debt).
 * Note: amounts are stored as Math.abs(), so direction must be derived from transactionType.
 */
function buildSignedAmountSql(accountType: string) {
	if (accountType === 'credit_card') {
		return sql<number>`COALESCE(SUM(CASE WHEN ${importedTransactions.transactionType} IN ('CREDIT', 'PAYMENT') OR ${importedTransactions.isIncome} = 1 THEN ${importedTransactions.amount} ELSE -${importedTransactions.amount} END), 0)`;
	}
	return sql<number>`COALESCE(SUM(CASE WHEN ${importedTransactions.transactionType} = 'CREDIT' OR ${importedTransactions.isIncome} = 1 THEN ${importedTransactions.amount} ELSE -${importedTransactions.amount} END), 0)`;
}

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
 *   initialBalance + sum of ALL imported transaction amounts after balanceAsOfDate
 *
 * If balanceAsOfDate is null, all transactions are included (original behavior).
 * If set, only transactions with datePosted > balanceAsOfDate are summed,
 * since the initialBalance already accounts for everything up to that date.
 * Note: both processed and unprocessed transactions are included — a transaction
 * affects your real balance regardless of whether it has been categorized.
 */
export function getAccountBalance(id: number): number {
	const account = getAccountById(id);
	if (!account) return 0;

	const conditions = [
		eq(importedTransactions.ownerAccountId, id)
	];

	if (account.balanceAsOfDate) {
		conditions.push(gt(importedTransactions.datePosted, account.balanceAsOfDate));
	}

	const result = db
		.select({
			total: buildSignedAmountSql(account.accountType)
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
			eq(importedTransactions.ownerAccountId, account.id)
		];

		if (account.balanceAsOfDate) {
			conditions.push(gt(importedTransactions.datePosted, account.balanceAsOfDate));
		}

		const result = db
			.select({
				total: buildSignedAmountSql(account.accountType)
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
