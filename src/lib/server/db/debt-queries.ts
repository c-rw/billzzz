import { db } from './index';
import { debts, debtPayments, debtStrategySettings, bills } from './schema';
import type { NewDebt, NewDebtPayment, NewDebtStrategySettings } from './schema';
import type { DebtWithDetails, DebtSummary } from '$lib/types/debt';
import { eq, desc, sql, and, isNotNull } from 'drizzle-orm';

/**
 * Get all debts
 */
export function getAllDebts(): DebtWithDetails[] {
	return db
		.select({
			debt: debts,
			linkedBill: bills
		})
		.from(debts)
		.leftJoin(bills, eq(debts.linkedBillId, bills.id))
		.orderBy(debts.createdAt)
		.all()
		.map((row) => ({
			...row.debt,
			linkedBill: row.linkedBill
		}));
}

/**
 * Get all debts with full details including payments
 */
export function getDebtsWithDetails(): DebtWithDetails[] {
	const allDebts = getAllDebts();

	// Get all payments
	const allPayments = db.select().from(debtPayments).orderBy(desc(debtPayments.paymentDate)).all();

	// Group payments by debt
	const paymentsByDebt = allPayments.reduce(
		(acc, payment) => {
			if (!acc[payment.debtId]) {
				acc[payment.debtId] = [];
			}
			acc[payment.debtId].push(payment);
			return acc;
		},
		{} as Record<number, typeof allPayments>
	);

	// Attach payments and calculate totals
	return allDebts.map((debt) => {
		const payments = paymentsByDebt[debt.id] || [];
		const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

		// Calculate total overpayment applied from bill payments (auto-created entries)
		const totalOverpaymentApplied = payments
			.filter((p) => p.sourceBillCycleId !== null)
			.reduce((sum, p) => sum + p.amount, 0);

		return {
			...debt,
			payments,
			totalPaid,
			totalOverpaymentApplied
		};
	});
}

/**
 * Get a single debt by ID
 */
export function getDebtById(id: number): DebtWithDetails | undefined {
	const result = db
		.select({
			debt: debts,
			linkedBill: bills
		})
		.from(debts)
		.leftJoin(bills, eq(debts.linkedBillId, bills.id))
		.where(eq(debts.id, id))
		.get();

	if (!result) return undefined;

	const payments = db
		.select()
		.from(debtPayments)
		.where(eq(debtPayments.debtId, id))
		.orderBy(desc(debtPayments.paymentDate))
		.all();

	const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

	const totalOverpaymentApplied = payments
		.filter((p) => p.sourceBillCycleId !== null)
		.reduce((sum, p) => sum + p.amount, 0);

	return {
		...result.debt,
		linkedBill: result.linkedBill,
		payments,
		totalPaid,
		totalOverpaymentApplied
	};
}

/**
 * Create a new debt
 */
export function createDebt(data: NewDebt) {
	const result = db.insert(debts).values(data).returning().get();
	return result;
}

/**
 * Update a debt
 */
export function updateDebt(id: number, data: Partial<NewDebt>) {
	const result = db
		.update(debts)
		.set({
			...data,
			updatedAt: new Date()
		})
		.where(eq(debts.id, id))
		.returning()
		.get();
	return result;
}

/**
 * Delete a debt
 */
export function deleteDebt(id: number) {
	db.delete(debts).where(eq(debts.id, id)).run();
}

/**
 * Record a debt payment
 */
export function recordDebtPayment(data: NewDebtPayment) {
	const payment = db.insert(debtPayments).values(data).returning().get();

	// Update the debt's current balance
	const debt = db.select().from(debts).where(eq(debts.id, data.debtId)).get();

	if (debt) {
		const newBalance = Math.max(0, debt.currentBalance - data.amount);
		db.update(debts)
			.set({
				currentBalance: newBalance,
				updatedAt: new Date()
			})
			.where(eq(debts.id, data.debtId))
			.run();
	}

	return payment;
}

/**
 * Get debt payment history
 */
export function getDebtPaymentHistory(debtId: number) {
	return db
		.select()
		.from(debtPayments)
		.where(eq(debtPayments.debtId, debtId))
		.orderBy(desc(debtPayments.paymentDate))
		.all();
}

/**
 * Delete a debt payment
 */
export function deleteDebtPayment(id: number) {
	// Get payment info first to update debt balance
	const payment = db.select().from(debtPayments).where(eq(debtPayments.id, id)).get();

	if (payment) {
		// Restore the amount to debt balance
		const debt = db.select().from(debts).where(eq(debts.id, payment.debtId)).get();
		if (debt) {
			db.update(debts)
				.set({
					currentBalance: debt.currentBalance + payment.amount,
					updatedAt: new Date()
				})
				.where(eq(debts.id, payment.debtId))
				.run();
		}
	}

	db.delete(debtPayments).where(eq(debtPayments.id, id)).run();
}

/**
 * Get debt strategy settings
 */
export function getStrategySettings() {
	const settings = db.select().from(debtStrategySettings).get();

	// Return default if not exists
	if (!settings) {
		return {
			id: 0,
			strategy: 'snowball' as const,
			extraMonthlyPayment: 0,
			customPriorityOrder: null,
			createdAt: new Date(),
			updatedAt: new Date()
		};
	}

	return settings;
}

/**
 * Update debt strategy settings
 */
export function updateStrategySettings(data: Partial<NewDebtStrategySettings>) {
	const existing = db.select().from(debtStrategySettings).get();

	if (existing) {
		return db
			.update(debtStrategySettings)
			.set({
				...data,
				updatedAt: new Date()
			})
			.where(eq(debtStrategySettings.id, existing.id))
			.returning()
			.get();
	} else {
		return db
			.insert(debtStrategySettings)
			.values({
				strategy: data.strategy || 'snowball',
				extraMonthlyPayment: data.extraMonthlyPayment || 0,
				customPriorityOrder: data.customPriorityOrder || null
			})
			.returning()
			.get();
	}
}

/**
 * Calculate debt summary statistics
 */
export function getDebtSummary(): DebtSummary {
	const allDebts = getAllDebts();

	if (allDebts.length === 0) {
		return {
			totalDebts: 0,
			totalBalance: 0,
			totalOriginalBalance: 0,
			totalMinimumPayment: 0,
			weightedAverageInterestRate: 0,
			totalPaid: 0,
			percentPaid: 0
		};
	}

	const totalBalance = allDebts.reduce((sum, d) => sum + d.currentBalance, 0);
	const totalOriginalBalance = allDebts.reduce((sum, d) => sum + d.originalBalance, 0);
	const totalMinimumPayment = allDebts.reduce((sum, d) => sum + d.minimumPayment, 0);

	// Calculate weighted average interest rate
	const weightedRate = allDebts.reduce(
		(sum, d) => sum + d.interestRate * (d.currentBalance / totalBalance),
		0
	);

	const totalPaid = totalOriginalBalance - totalBalance;
	const percentPaid = totalOriginalBalance > 0 ? (totalPaid / totalOriginalBalance) * 100 : 0;

	return {
		totalDebts: allDebts.length,
		totalBalance,
		totalOriginalBalance,
		totalMinimumPayment,
		weightedAverageInterestRate: weightedRate,
		totalPaid,
		percentPaid
	};
}

/**
 * Find the debt linked to a specific bill (reverse lookup).
 * A bill can have at most one debt pointing to it.
 */
export function getDebtByLinkedBillId(billId: number) {
	return db
		.select()
		.from(debts)
		.where(eq(debts.linkedBillId, billId))
		.get();
}

/**
 * Sync a debt's minimum payment to its linked bill's amount.
 * Called after the debt's minimumPayment changes.
 */
export function syncDebtMinimumToBill(debtId: number) {
	const debt = db.select().from(debts).where(eq(debts.id, debtId)).get();
	if (!debt || !debt.linkedBillId) return;

	db.update(bills)
		.set({
			amount: debt.minimumPayment,
			updatedAt: new Date()
		})
		.where(eq(bills.id, debt.linkedBillId))
		.run();
}

/**
 * Get auto-created debt payments (those with a sourceBillCycleId) for a given debt.
 * Used to display overpayment info on the UI.
 */
export function getAutoDebtPayments(debtId: number) {
	return db
		.select()
		.from(debtPayments)
		.where(
			and(
				eq(debtPayments.debtId, debtId),
				isNotNull(debtPayments.sourceBillCycleId)
			)
		)
		.orderBy(desc(debtPayments.paymentDate))
		.all();
}
