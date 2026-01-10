import { db } from './index';
import { bills, buckets, debts, paydaySettings, userPreferences, importedTransactions } from './schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { calculateNextPayday, calculateFollowingPayday } from '../utils/payday';
import { addDays, addWeeks, addMonths, addQuarters, addYears, startOfDay, differenceInDays } from 'date-fns';

export interface CashFlowDataPoint {
	date: Date;
	balance: number;
	income: number;
	expenses: number;
	events: Array<{ type: 'income' | 'bill' | 'bucket' | 'debt'; description: string; amount: number }>;
}

export interface AnalyticsWarning {
	date: Date;
	type: 'negative_balance' | 'low_balance' | 'large_expense';
	severity: 'high' | 'medium' | 'low';
	message: string;
	amount?: number;
}

export interface AnalyticsData {
	cashFlowProjection: CashFlowDataPoint[];
	warnings: AnalyticsWarning[];
	metrics: {
		currentBalance: number | null;
		expectedIncome: number | null;
		nextPayday: Date | null;
		savingsPerPaycheck: number;
		burnRate: number;
		runway: number;
		totalMonthlyObligations: number;
		totalMonthlyBills: number;
		totalMonthlyBuckets: number;
		totalMonthlyDebts: number;
	};
	spendingBreakdown: {
		bills: number;
		buckets: number;
		debts: number;
	};
}

/**
 * Get historical income data from imported transactions
 */
export async function getHistoricalIncomeData() {
	const incomeTransactions = await db
		.select()
		.from(importedTransactions)
		.where(eq(importedTransactions.isIncome, true))
		.orderBy(desc(importedTransactions.datePosted))
		.limit(10);

	if (incomeTransactions.length === 0) {
		return { averageIncome: null, transactions: [] };
	}

	const total = incomeTransactions.reduce((sum, t) => sum + t.amount, 0);
	const averageIncome = total / incomeTransactions.length;

	return {
		averageIncome,
		transactions: incomeTransactions
	};
}

/**
 * Calculate total monthly obligations
 */
async function calculateMonthlyObligations() {
	const allBills = await db.select().from(bills);
	const allBuckets = await db.select().from(buckets).where(eq(buckets.isDeleted, false));
	const allDebts = await db.select().from(debts);

	// Calculate monthly bill costs
	let monthlyBills = 0;
	for (const bill of allBills) {
		if (!bill.isRecurring) {
			continue; // Skip one-time bills for monthly calculation
		}

		switch (bill.recurrenceType) {
			case 'weekly':
				monthlyBills += bill.amount * 4.33; // Average weeks per month
				break;
			case 'biweekly':
				monthlyBills += bill.amount * 2.17; // Average bi-weeks per month
				break;
			case 'monthly':
				monthlyBills += bill.amount;
				break;
			case 'quarterly':
				monthlyBills += bill.amount / 3;
				break;
			case 'yearly':
				monthlyBills += bill.amount / 12;
				break;
		}
	}

	// Calculate monthly bucket costs
	let monthlyBuckets = 0;
	for (const bucket of allBuckets) {
		switch (bucket.frequency) {
			case 'weekly':
				monthlyBuckets += bucket.budgetAmount * 4.33;
				break;
			case 'biweekly':
				monthlyBuckets += bucket.budgetAmount * 2.17;
				break;
			case 'monthly':
				monthlyBuckets += bucket.budgetAmount;
				break;
			case 'quarterly':
				monthlyBuckets += bucket.budgetAmount / 3;
				break;
			case 'yearly':
				monthlyBuckets += bucket.budgetAmount / 12;
				break;
		}
	}

	// Calculate monthly debt payments (exclude debts linked to bills to avoid double-counting)
	const monthlyDebts = allDebts
		.filter(debt => debt.linkedBillId === null)
		.reduce((sum, debt) => sum + debt.minimumPayment, 0);

	return {
		totalMonthlyBills: monthlyBills,
		totalMonthlyBuckets: monthlyBuckets,
		totalMonthlyDebts: monthlyDebts,
		totalMonthlyObligations: monthlyBills + monthlyBuckets + monthlyDebts
	};
}

/**
 * Project cash flow over the next N days
 */
async function projectCashFlow(
	startingBalance: number,
	expectedIncome: number,
	daysToProject: number = 90
): Promise<{ dataPoints: CashFlowDataPoint[]; warnings: AnalyticsWarning[] }> {
	const dataPoints: CashFlowDataPoint[] = [];
	const warnings: AnalyticsWarning[] = [];

	// Get all data
	const allBills = await db.select().from(bills);
	const allBuckets = await db.select().from(buckets).where(eq(buckets.isDeleted, false));
	const allDebts = await db.select().from(debts);
	const paydayConfig = await db.select().from(paydaySettings).limit(1);

	// Calculate daily bucket allocation (spread monthly budget over 30 days)
	let dailyBucketCost = 0;
	for (const bucket of allBuckets) {
		let monthlyAmount = 0;
		switch (bucket.frequency) {
			case 'weekly':
				monthlyAmount = bucket.budgetAmount * 4.33;
				break;
			case 'biweekly':
				monthlyAmount = bucket.budgetAmount * 2.17;
				break;
			case 'monthly':
				monthlyAmount = bucket.budgetAmount;
				break;
			case 'quarterly':
				monthlyAmount = bucket.budgetAmount / 3;
				break;
			case 'yearly':
				monthlyAmount = bucket.budgetAmount / 12;
				break;
		}
		dailyBucketCost += monthlyAmount / 30;
	}

	// Define today and projection end date at the start
	const today = startOfDay(new Date());
	const endDate = addDays(today, daysToProject);

	// Get payday schedule
	const paydays: Date[] = [];
	if (paydayConfig.length > 0) {
		const config = paydayConfig[0];
		let currentPayday = calculateNextPayday(config, today);

		while (currentPayday <= endDate) {
			paydays.push(currentPayday);

			// Calculate next payday by adding the appropriate period
			switch (config.frequency) {
				case 'weekly':
					currentPayday = addWeeks(currentPayday, 1);
					break;
				case 'biweekly':
					currentPayday = addWeeks(currentPayday, 2);
					break;
				case 'semi-monthly':
					// Use the helper function for complex semi-monthly logic
					currentPayday = calculateFollowingPayday(config, currentPayday);
					break;
				case 'monthly':
					currentPayday = addMonths(currentPayday, 1);
					break;
			}
		}
	}

	// Pre-calculate all bill due dates for the projection period
	const billDueDates: Map<string, { bill: typeof allBills[0]; dueDate: Date }[]> = new Map();

	for (const bill of allBills) {
		if (bill.isPaid && !bill.isRecurring) {
			// Skip one-time bills that are already paid
			continue;
		}

		if (bill.isRecurring && bill.recurrenceType) {
			// For recurring bills, calculate all occurrences in the projection period
			// Start with the bill's original due date
			let nextOccurrence = startOfDay(bill.dueDate);

			// Fast-forward to the first occurrence on or after today
			while (nextOccurrence < today) {
				switch (bill.recurrenceType) {
					case 'weekly':
						nextOccurrence = addWeeks(nextOccurrence, 1);
						break;
					case 'biweekly':
						nextOccurrence = addWeeks(nextOccurrence, 2);
						break;
					case 'monthly':
						nextOccurrence = addMonths(nextOccurrence, 1);
						break;
					case 'quarterly':
						nextOccurrence = addQuarters(nextOccurrence, 1);
						break;
					case 'yearly':
						nextOccurrence = addYears(nextOccurrence, 1);
						break;
				}
			}

			// Generate all occurrences within the projection period
			while (nextOccurrence <= endDate) {
				const dateKey = nextOccurrence.toISOString();
				if (!billDueDates.has(dateKey)) {
					billDueDates.set(dateKey, []);
				}
				billDueDates.get(dateKey)!.push({ bill, dueDate: nextOccurrence });

				// Calculate next occurrence based on recurrence type
				switch (bill.recurrenceType) {
					case 'weekly':
						nextOccurrence = addWeeks(nextOccurrence, 1);
						break;
					case 'biweekly':
						nextOccurrence = addWeeks(nextOccurrence, 2);
						break;
					case 'monthly':
						nextOccurrence = addMonths(nextOccurrence, 1);
						break;
					case 'quarterly':
						nextOccurrence = addQuarters(nextOccurrence, 1);
						break;
					case 'yearly':
						nextOccurrence = addYears(nextOccurrence, 1);
						break;
				}
			}
		} else {
			// For non-recurring bills, only include if due within projection period
			const billDue = startOfDay(bill.dueDate);
			if (billDue >= today && billDue <= endDate && !bill.isPaid) {
				const dateKey = billDue.toISOString();
				if (!billDueDates.has(dateKey)) {
					billDueDates.set(dateKey, []);
				}
				billDueDates.get(dateKey)!.push({ bill, dueDate: billDue });
			}
		}
	}

	// Simulate day by day
	let runningBalance = startingBalance;

	for (let day = 0; day < daysToProject; day++) {
		const currentDate = addDays(today, day);
		const events: Array<{ type: 'income' | 'bill' | 'bucket' | 'debt'; description: string; amount: number }> = [];
		let dailyIncome = 0;
		let dailyExpenses = 0;

		// Check for payday
		const isPayday = paydays.some((pd) => {
			const pdStart = startOfDay(pd);
			const currStart = startOfDay(currentDate);
			return pdStart.getTime() === currStart.getTime();
		});

		if (isPayday && expectedIncome > 0) {
			dailyIncome += expectedIncome;
			runningBalance += expectedIncome;
			events.push({
				type: 'income',
				description: 'Paycheck',
				amount: expectedIncome
			});
		}

		// Check for bills due on this date
		const dateKey = startOfDay(currentDate).toISOString();
		const dueBills = billDueDates.get(dateKey) || [];

		for (const { bill } of dueBills) {
			dailyExpenses += bill.amount;
			runningBalance -= bill.amount;
			events.push({
				type: 'bill',
				description: bill.name,
				amount: bill.amount
			});
		}

		// Daily bucket allocation
		if (dailyBucketCost > 0) {
			dailyExpenses += dailyBucketCost;
			runningBalance -= dailyBucketCost;
			events.push({
				type: 'bucket',
				description: 'Daily variable spending',
				amount: dailyBucketCost
			});
		}

		// Check for debt payments (assume monthly on the 1st)
		// Exclude debts linked to bills to avoid double-counting
		if (currentDate.getDate() === 1) {
			const unlinkedDebts = allDebts.filter(debt => debt.linkedBillId === null);
			const totalDebtPayment = unlinkedDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);
			if (totalDebtPayment > 0) {
				dailyExpenses += totalDebtPayment;
				runningBalance -= totalDebtPayment;
				events.push({
					type: 'debt',
					description: 'Debt minimum payments',
					amount: totalDebtPayment
				});
			}
		}

		dataPoints.push({
			date: currentDate,
			balance: runningBalance,
			income: dailyIncome,
			expenses: dailyExpenses,
			events
		});

		// Generate warnings
		if (runningBalance < 0) {
			warnings.push({
				date: currentDate,
				type: 'negative_balance',
				severity: 'high',
				message: `Projected negative balance of $${Math.abs(runningBalance).toFixed(2)}`,
				amount: runningBalance
			});
		} else if (runningBalance < 100 && runningBalance > 0) {
			warnings.push({
				date: currentDate,
				type: 'low_balance',
				severity: 'medium',
				message: `Low balance warning: Only $${runningBalance.toFixed(2)} remaining`,
				amount: runningBalance
			});
		}

		// Large expense warning
		if (dailyExpenses > expectedIncome * 0.5 && expectedIncome > 0) {
			warnings.push({
				date: currentDate,
				type: 'large_expense',
				severity: 'medium',
				message: `Large expense day: $${dailyExpenses.toFixed(2)} in expenses`,
				amount: dailyExpenses
			});
		}
	}

	return { dataPoints, warnings };
}

/**
 * Get comprehensive analytics data
 */
export async function getAnalyticsData(): Promise<AnalyticsData> {
	// Get user preferences
	const prefs = await db.select().from(userPreferences).limit(1);
	const userPref = prefs.length > 0 ? prefs[0] : null;

	const currentBalance = userPref?.currentBalance ?? null;
	const expectedIncome = userPref?.expectedIncomeAmount ?? null;

	// Get payday info
	const paydayConfig = await db.select().from(paydaySettings).limit(1);
	const nextPayday = paydayConfig.length > 0 ? calculateNextPayday(paydayConfig[0], new Date()) : null;

	// Calculate monthly obligations
	const obligations = await calculateMonthlyObligations();

	// Project cash flow
	const { dataPoints, warnings } = await projectCashFlow(
		currentBalance ?? 0,
		expectedIncome ?? 0,
		90
	);

	// Calculate metrics
	const burnRate = obligations.totalMonthlyObligations / 30; // Daily burn rate
	const runway = currentBalance && burnRate > 0 ? currentBalance / burnRate : 0;

	// Calculate savings per paycheck
	let paychecksPerMonth = 2; // Default to biweekly
	if (paydayConfig.length > 0) {
		const freq = paydayConfig[0].frequency;
		paychecksPerMonth =
			freq === 'weekly' ? 4.33 : freq === 'biweekly' ? 2.17 : freq === 'semi-monthly' ? 2 : 1;
	}

	const monthlyIncome = (expectedIncome ?? 0) * paychecksPerMonth;
	const savingsPerPaycheck = Math.max(0, (monthlyIncome - obligations.totalMonthlyObligations) / paychecksPerMonth);

	return {
		cashFlowProjection: dataPoints,
		warnings: warnings.slice(0, 10), // Return top 10 warnings
		metrics: {
			currentBalance,
			expectedIncome,
			nextPayday,
			savingsPerPaycheck,
			burnRate,
			runway,
			totalMonthlyObligations: obligations.totalMonthlyObligations,
			totalMonthlyBills: obligations.totalMonthlyBills,
			totalMonthlyBuckets: obligations.totalMonthlyBuckets,
			totalMonthlyDebts: obligations.totalMonthlyDebts
		},
		spendingBreakdown: {
			bills: obligations.totalMonthlyBills,
			buckets: obligations.totalMonthlyBuckets,
			debts: obligations.totalMonthlyDebts
		}
	};
}

/**
 * Update user analytics preferences
 */
export async function updateAnalyticsPreferences(data: {
	expectedIncomeAmount?: number;
	currentBalance?: number;
}) {
	const prefs = await db.select().from(userPreferences).limit(1);

	if (prefs.length === 0) {
		// Create new preferences
		await db.insert(userPreferences).values({
			themePreference: 'system',
			expectedIncomeAmount: data.expectedIncomeAmount,
			currentBalance: data.currentBalance,
			lastBalanceUpdate: data.currentBalance !== undefined ? new Date() : undefined
		});
	} else {
		// Update existing
		await db
			.update(userPreferences)
			.set({
				expectedIncomeAmount: data.expectedIncomeAmount,
				currentBalance: data.currentBalance,
				lastBalanceUpdate: data.currentBalance !== undefined ? new Date() : undefined,
				updatedAt: new Date()
			})
			.where(eq(userPreferences.id, prefs[0].id));
	}
}
