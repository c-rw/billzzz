import { db } from './index';
import {
	bills,
	categories,
	paydaySettings,
	importSessions,
	importedTransactions,
	accounts,
	type NewBill,
	type NewCategory,
	type Category,
	type NewPaydaySettings,
	type NewImportSession,
	type NewImportedTransaction,
	type Account,
	type NewAccount
} from './schema';
import { eq, and, gte, lte, desc, asc, like, or, sql } from 'drizzle-orm';
import type { BillFilters, BillSort } from '$lib/types/bill';
import { calculateNextPayday, calculateFollowingPayday } from '../utils/payday';

// ===== ACCOUNT QUERIES =====

export function getAllAccounts(): (Account & { balance: number })[] {
	const allAccounts = db.select().from(accounts).orderBy(accounts.name).all();

	// Calculate balance for each account based on transfers
	return allAccounts.map(account => {
		// For internal accounts, calculate balance from transfers
		// DEBIT transactions to this account = money IN (positive)
		// CREDIT transactions from this account = money OUT (negative)
		const balanceResult = db
			.select({
				balance: sql<number>`
					COALESCE(
						SUM(
							CASE
								WHEN ${importedTransactions.transactionType} = 'DEBIT' THEN ${importedTransactions.amount}
								WHEN ${importedTransactions.transactionType} = 'CREDIT' THEN -${importedTransactions.amount}
								ELSE 0
							END
						),
						0
					)
				`
			})
			.from(importedTransactions)
			.where(
				and(
					eq(importedTransactions.isTransfer, true),
					eq(importedTransactions.counterpartyAccountId, account.id)
				)
			)
			.get();

		return {
			...account,
			balance: balanceResult?.balance ?? 0
		};
	});
}

export function getAccountById(id: number) {
	return db.select().from(accounts).where(eq(accounts.id, id)).get();
}

export function createAccount(data: NewAccount) {
	return db.insert(accounts).values(data).returning().get();
}

export function updateAccount(id: number, data: Partial<NewAccount>) {
	return db
		.update(accounts)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(accounts.id, id))
		.returning()
		.get();
}

export function deleteAccount(id: number) {
	return db.delete(accounts).where(eq(accounts.id, id)).returning().get();
}

// ===== CATEGORY QUERIES =====

export function getAllCategories(): Category[] {
	return db.select().from(categories).orderBy(categories.name).all();
}

export function getCategoryById(id: number) {
	return db.select().from(categories).where(eq(categories.id, id)).get();
}

export function createCategory(data: NewCategory) {
	return db.insert(categories).values(data).returning().get();
}

export function updateCategory(id: number, data: Partial<NewCategory>) {
	return db.update(categories).set(data).where(eq(categories.id, id)).returning().get();
}

export function deleteCategory(id: number) {
	return db.delete(categories).where(eq(categories.id, id)).returning().get();
}

// ===== BILL QUERIES =====

export function getAllBills(filters?: BillFilters, sort?: BillSort) {
	let query = db
		.select({
			id: bills.id,
			name: bills.name,
			amount: bills.amount,
			dueDate: bills.dueDate,
			paymentLink: bills.paymentLink,
			categoryId: bills.categoryId,
			isRecurring: bills.isRecurring,
			recurrenceType: bills.recurrenceType,
			recurrenceDay: bills.recurrenceDay,
			isPaid: bills.isPaid,
			isAutopay: bills.isAutopay,
			notes: bills.notes,
			createdAt: bills.createdAt,
			updatedAt: bills.updatedAt,
			category: categories
		})
		.from(bills)
		.leftJoin(categories, eq(bills.categoryId, categories.id));

	// Apply filters
	const conditions = [];

	if (filters?.status && filters.status !== 'all') {
		const now = new Date();

		if (filters.status === 'paid') {
			conditions.push(eq(bills.isPaid, true));
		} else if (filters.status === 'unpaid') {
			conditions.push(eq(bills.isPaid, false));
		} else if (filters.status === 'overdue') {
			conditions.push(
				and(
					eq(bills.isPaid, false),
					lte(bills.dueDate, now)
				)
			);
		} else if (filters.status === 'upcoming') {
			const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
			conditions.push(
				and(
					eq(bills.isPaid, false),
					gte(bills.dueDate, now),
					lte(bills.dueDate, sevenDaysFromNow)
				)
			);
		}
	}

	if (filters?.categoryId) {
		conditions.push(eq(bills.categoryId, filters.categoryId));
	}

	if (filters?.searchQuery) {
		conditions.push(
			or(
				like(bills.name, `%${filters.searchQuery}%`),
				like(bills.notes, `%${filters.searchQuery}%`)
			)
		);
	}

	if (conditions.length > 0) {
		query = query.where(and(...conditions)) as any;
	}

	// Apply sorting
	if (sort) {
		const column = bills[sort.field];
		const direction = sort.direction === 'asc' ? asc : desc;
		query = query.orderBy(direction(column)) as any;
	} else {
		// Default sort by due date ascending
		query = query.orderBy(asc(bills.dueDate)) as any;
	}

	return query.all();
}

export function getBillById(id: number) {
	return db
		.select({
			id: bills.id,
			name: bills.name,
			amount: bills.amount,
			dueDate: bills.dueDate,
			paymentLink: bills.paymentLink,
			categoryId: bills.categoryId,
			isRecurring: bills.isRecurring,
			recurrenceType: bills.recurrenceType,
			recurrenceDay: bills.recurrenceDay,
			isPaid: bills.isPaid,
			isAutopay: bills.isAutopay,
			notes: bills.notes,
			createdAt: bills.createdAt,
			updatedAt: bills.updatedAt,
			category: categories
		})
		.from(bills)
		.leftJoin(categories, eq(bills.categoryId, categories.id))
		.where(eq(bills.id, id))
		.get();
}

export function createBill(data: NewBill) {
	return db.insert(bills).values(data).returning().get();
}

export function updateBill(id: number, data: Partial<NewBill>) {
	return db
		.update(bills)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(bills.id, id))
		.returning()
		.get();
}

export function deleteBill(id: number) {
	// Reset any imported transactions that were mapped to this bill
	// This allows them to be re-imported and remapped after bill deletion
	db.update(importedTransactions)
		.set({
			isProcessed: false,
			mappedBillId: null // Redundant due to foreign key, but explicit
		})
		.where(eq(importedTransactions.mappedBillId, id))
		.run();

	// Delete the bill (payment_history will cascade delete automatically)
	return db.delete(bills).where(eq(bills.id, id)).returning().get();
}

export function markBillAsPaid(id: number, paid: boolean) {
	return db
		.update(bills)
		.set({
			isPaid: paid,
			updatedAt: new Date()
		})
		.where(eq(bills.id, id))
		.returning()
		.get();
}

// ===== DASHBOARD STATS =====

export function getDashboardStats() {
	const now = new Date();
	const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

	const allBills = db.select().from(bills).all();

	const totalBills = allBills.length;
	const paidBills = allBills.filter((b) => b.isPaid).length;
	const unpaidBills = totalBills - paidBills;
	const overdueBills = allBills.filter((b) => !b.isPaid && b.dueDate <= now).length;
	const upcomingBills = allBills.filter(
		(b) => !b.isPaid && b.dueDate > now && b.dueDate <= sevenDaysFromNow
	).length;

	// Calculate total amount due in next 30 days (including overdue)
	const totalAmount = allBills
		.filter((b) => !b.isPaid && b.dueDate <= thirtyDaysFromNow)
		.reduce((sum, b) => sum + b.amount, 0);

	// Get payday settings if configured
	const paydayConfig = getPaydaySettings();
	let nextPayday: Date | null = null;
	let followingPayday: Date | null = null;
	let dueBeforeNextPayday = 0;
	let amountDueBeforeNextPayday = 0;
	let dueBeforeFollowingPayday = 0;
	let amountDueBeforeFollowingPayday = 0;

	if (paydayConfig) {
		try {
			nextPayday = calculateNextPayday(paydayConfig, now);
			followingPayday = calculateFollowingPayday(paydayConfig, now);

			// Count bills due before next payday
			const billsBeforeNextPayday = allBills.filter(
				(b) => !b.isPaid && b.dueDate <= nextPayday!
			);
			dueBeforeNextPayday = billsBeforeNextPayday.length;
			amountDueBeforeNextPayday = billsBeforeNextPayday.reduce((sum, b) => sum + b.amount, 0);

			// Count bills due before following payday
			const billsBeforeFollowingPayday = allBills.filter(
				(b) => !b.isPaid && b.dueDate <= followingPayday!
			);
			dueBeforeFollowingPayday = billsBeforeFollowingPayday.length;
			amountDueBeforeFollowingPayday = billsBeforeFollowingPayday.reduce((sum, b) => sum + b.amount, 0);
		} catch (error) {
			console.error('Error calculating payday stats:', error);
		}
	}

	return {
		totalBills,
		paidBills,
		unpaidBills,
		overdueBills,
		upcomingBills,
		totalAmount,
		nextPayday,
		followingPayday,
		dueBeforeNextPayday,
		amountDueBeforeNextPayday,
		dueBeforeFollowingPayday,
		amountDueBeforeFollowingPayday,
		hasPaydayConfigured: paydayConfig !== undefined
	};
}

// ===== PAYDAY SETTINGS QUERIES =====

export function getPaydaySettings() {
	// There should only be one payday settings record
	return db.select().from(paydaySettings).get();
}

export function createPaydaySettings(data: NewPaydaySettings) {
	return db.insert(paydaySettings).values(data).returning().get();
}

export function updatePaydaySettings(id: number, data: Partial<NewPaydaySettings>) {
	return db
		.update(paydaySettings)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(paydaySettings.id, id))
		.returning()
		.get();
}

export function deletePaydaySettings(id: number) {
	return db.delete(paydaySettings).where(eq(paydaySettings.id, id)).returning().get();
}

// ===== IMPORT QUERIES =====

export function createImportSession(data: NewImportSession) {
	return db.insert(importSessions).values(data).returning().get();
}

export function getImportSession(id: number) {
	return db.select().from(importSessions).where(eq(importSessions.id, id)).get();
}

export function updateImportSession(
	id: number,
	data: Partial<Omit<NewImportSession, 'createdAt'>>
) {
	return db.update(importSessions).set(data).where(eq(importSessions.id, id)).returning().get();
}

export function getAllImportSessions() {
	return db.select().from(importSessions).orderBy(desc(importSessions.createdAt)).all();
}

export function createImportedTransaction(data: NewImportedTransaction) {
	return db.insert(importedTransactions).values(data).returning().get();
}

export function createImportedTransactionsBatch(data: NewImportedTransaction[]) {
	return db.insert(importedTransactions).values(data).returning().all();
}

export function getImportedTransactionsBySession(sessionId: number) {
	return db
		.select({
			transaction: importedTransactions,
			bill: bills,
			category: categories
		})
		.from(importedTransactions)
		.leftJoin(bills, eq(importedTransactions.mappedBillId, bills.id))
		.leftJoin(categories, eq(importedTransactions.suggestedCategoryId, categories.id))
		.where(eq(importedTransactions.sessionId, sessionId))
		.orderBy(desc(importedTransactions.datePosted))
		.all();
}

export function updateImportedTransaction(
	id: number,
	data: Partial<Omit<NewImportedTransaction, 'createdAt' | 'sessionId' | 'fitId'>>
) {
	return db
		.update(importedTransactions)
		.set(data)
		.where(eq(importedTransactions.id, id))
		.returning()
		.get();
}

export function deleteImportedTransaction(id: number) {
	return db.delete(importedTransactions).where(eq(importedTransactions.id, id)).returning().get();
}

export function checkDuplicateFitId(fitId: string) {
	// Check if transaction exists and has been processed
	// This prevents re-importing already processed transactions
	// Unprocessed transactions from old sessions won't block new imports
	return db
		.select()
		.from(importedTransactions)
		.where(
			and(
				eq(importedTransactions.fitId, fitId),
				eq(importedTransactions.isProcessed, true)
			)
		)
		.get();
}

export function checkAnyDuplicateFitId(fitId: string) {
	// Check if transaction exists at all (processed OR unprocessed)
	// Used during import to prevent importing same file multiple times
	return db
		.select()
		.from(importedTransactions)
		.where(eq(importedTransactions.fitId, fitId))
		.get();
}

export function getUnprocessedTransactions(sessionId: number) {
	return db
		.select()
		.from(importedTransactions)
		.where(
			and(eq(importedTransactions.sessionId, sessionId), eq(importedTransactions.isProcessed, false))
		)
		.all();
}

export function markTransactionsAsProcessed(transactionIds: number[]) {
	return db
		.update(importedTransactions)
		.set({ isProcessed: true })
		.where(sql`${importedTransactions.id} IN ${sql.raw(`(${transactionIds.join(',')})`)}`)
		.returning()
		.all();
}
