import { db } from './index';
import { bills, buckets, debts, paydaySettings, userPreferences, debtStrategySettings, bucketAllocations } from './schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { calculateNextPayday, calculateFollowingPayday } from '../utils/payday';
import { addDays, addWeeks, addMonths, startOfDay, differenceInDays } from 'date-fns';
import { utcDateToLocal } from '$lib/utils/dates';
import { calculateNextDueDate } from '../utils/recurrence';
import type { RecurrenceType } from '$lib/types/bill';
import { getAccountsWithBalances } from './account-queries';
import { sortBySnowball, sortByAvalanche, sortByCustom } from '../utils/debt-calculator';
import type { Debt } from '$lib/types/debt';

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
		currentBalance: number;
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
			case 'semi-monthly':
				monthlyBills += bill.amount * 2; // Twice a month
				break;
			case 'monthly':
				monthlyBills += bill.amount;
				break;
			case 'quarterly':
				monthlyBills += bill.amount / 3;
				break;
			case 'semi-annual':
				monthlyBills += bill.amount / 6;
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
	const unlinkedDebts = allDebts.filter(debt => debt.linkedBillId === null);
	const monthlyDebtMinimums = unlinkedDebts.reduce((sum, debt) => sum + debt.minimumPayment, 0);

	// Load debt strategy settings to include extra payment
	const strategyRow = await db.select().from(debtStrategySettings).limit(1);
	const extraMonthlyPayment = strategyRow.length > 0 ? strategyRow[0].extraMonthlyPayment : 0;
	const monthlyDebts = monthlyDebtMinimums + extraMonthlyPayment;

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
	const strategyRow = await db.select().from(debtStrategySettings).limit(1);

	// Debt strategy settings for distributing extra payment
	const strategy = strategyRow.length > 0 ? strategyRow[0].strategy : 'snowball';
	const extraMonthlyPayment = strategyRow.length > 0 ? strategyRow[0].extraMonthlyPayment : 0;
	const customPriorityOrder: number[] = strategyRow.length > 0 && strategyRow[0].customPriorityOrder
		? JSON.parse(strategyRow[0].customPriorityOrder)
		: [];

	// Sort unlinked debts by strategy for extra payment distribution
	const unlinkedDebts = allDebts.filter(debt => debt.linkedBillId === null) as Debt[];
	let sortedUnlinkedDebts: Debt[];
	switch (strategy) {
		case 'avalanche':
			sortedUnlinkedDebts = sortByAvalanche(unlinkedDebts);
			break;
		case 'custom':
			sortedUnlinkedDebts = sortByCustom(unlinkedDebts, customPriorityOrder);
			break;
		case 'snowball':
		default:
			sortedUnlinkedDebts = sortBySnowball(unlinkedDebts);
			break;
	}

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

	// Query upcoming bucket allocations (target date in the future)
	// These get spread as daily burn from today until their target date
	const upcomingAllocations = await db
		.select({
			amount: bucketAllocations.amount,
			targetDate: bucketAllocations.targetDate,
			notes: bucketAllocations.notes,
			bucketId: bucketAllocations.bucketId
		})
		.from(bucketAllocations)
		.innerJoin(buckets, eq(bucketAllocations.bucketId, buckets.id))
		.where(
			and(
				eq(buckets.isDeleted, false),
				gte(bucketAllocations.targetDate, today)
			)
		);

	// Calculate daily allocation burn rate: spread each allocation from today to its target date
	let dailyAllocationCost = 0;
	const allocationDetails: Array<{ dailyCost: number; bucketName: string; notes: string | null; amount: number; targetDate: Date }> = [];
	for (const alloc of upcomingAllocations) {
		const daysUntilTarget = differenceInDays(startOfDay(alloc.targetDate), today);
		if (daysUntilTarget <= 0) continue;
		const dailyCost = alloc.amount / daysUntilTarget;
		dailyAllocationCost += dailyCost;
		const bucketRecord = allBuckets.find(b => b.id === alloc.bucketId);
		allocationDetails.push({
			dailyCost,
			bucketName: bucketRecord?.name ?? 'Bucket',
			notes: alloc.notes,
			amount: alloc.amount,
			targetDate: alloc.targetDate
		});
	}

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
			// Start with the bill's original due date (converted to local midnight so keys
			// match the local-midnight keys produced by the day-loop below).
			let nextOccurrence = startOfDay(utcDateToLocal(bill.dueDate));

			// Fast-forward to the first occurrence on or after today
			let safetyCounter = 0;
			while (nextOccurrence < today && safetyCounter < 1000) {
				safetyCounter++;
				try {
					nextOccurrence = calculateNextDueDate(nextOccurrence, bill.recurrenceType as RecurrenceType, bill.recurrenceDay, (bill as any).recurrenceDay2);
				} catch {
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

				try {
					nextOccurrence = calculateNextDueDate(nextOccurrence, bill.recurrenceType as RecurrenceType, bill.recurrenceDay, (bill as any).recurrenceDay2);
				} catch {
					break;
				}
			}
		} else {
			// For non-recurring bills, only include if due within projection period
			const billDue = startOfDay(utcDateToLocal(bill.dueDate));
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

	// Track working debt balances so paid-off debts stop generating payments
	const debtBalances = new Map<number, number>();
	for (const debt of sortedUnlinkedDebts) {
		debtBalances.set(debt.id, debt.currentBalance);
	}

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

		// Daily allocation savings (spread evenly from today to each target date)
		if (dailyAllocationCost > 0) {
			// Only count allocations whose target date is still in the future
			let todayAllocationCost = 0;
			for (const alloc of allocationDetails) {
				if (currentDate < alloc.targetDate) {
					todayAllocationCost += alloc.dailyCost;
				}
			}
			if (todayAllocationCost > 0) {
				dailyExpenses += todayAllocationCost;
				runningBalance -= todayAllocationCost;
				events.push({
					type: 'bucket',
					description: `Saving for planned allocations (${allocationDetails.filter(a => currentDate < a.targetDate).map(a => a.notes || a.bucketName).join(', ')})`,
					amount: todayAllocationCost
				});
			}
		}

		// Check for debt payments (assume monthly on the 1st)
		// Exclude debts linked to bills to avoid double-counting
		// Show individual debt events with extra payment distributed by strategy priority
		if (currentDate.getDate() === 1 && sortedUnlinkedDebts.length > 0) {
			let remainingExtra = extraMonthlyPayment;

			for (const debt of sortedUnlinkedDebts) {
				const remainingDebtBalance = debtBalances.get(debt.id) ?? 0;
				if (remainingDebtBalance <= 0) continue; // Debt already paid off

				let payment = debt.minimumPayment;

				// Allocate extra payment to the highest-priority debt (first in sorted order)
				if (remainingExtra > 0) {
					payment += remainingExtra;
					remainingExtra = 0;
				}

				// Cap payment at remaining debt balance
				payment = Math.min(payment, remainingDebtBalance);

				if (payment > 0) {
					debtBalances.set(debt.id, remainingDebtBalance - payment);
					dailyExpenses += payment;
					runningBalance -= payment;
					events.push({
						type: 'debt',
						description: `${debt.name} payment`,
						amount: payment
					});
				}
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
	// Get user preferences (for expectedIncomeAmount)
	const prefs = await db.select().from(userPreferences).limit(1);
	const userPref = prefs.length > 0 ? prefs[0] : null;

	const expectedIncome = userPref?.expectedIncomeAmount ?? null;

	// Compute total balance from all non-external accounts
	const accountsWithBalances = getAccountsWithBalances();
	const currentBalance = accountsWithBalances
		.filter((a) => !a.isExternal)
		.reduce((sum, a) => sum + a.balance, 0);

	// Get payday info
	const paydayConfig = await db.select().from(paydaySettings).limit(1);
	const nextPayday = paydayConfig.length > 0 ? calculateNextPayday(paydayConfig[0], new Date()) : null;

	// Calculate monthly obligations
	const obligations = await calculateMonthlyObligations();

	// Project cash flow
	const { dataPoints, warnings } = await projectCashFlow(
		currentBalance,
		expectedIncome ?? 0,
		90
	);

	// Calculate metrics
	const burnRate = obligations.totalMonthlyObligations / 30; // Daily burn rate
	const runway = currentBalance > 0 && burnRate > 0 ? currentBalance / burnRate : 0;

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
}) {
	const prefs = await db.select().from(userPreferences).limit(1);

	if (prefs.length === 0) {
		// Create new preferences
		await db.insert(userPreferences).values({
			themePreference: 'system',
			expectedIncomeAmount: data.expectedIncomeAmount
		});
	} else {
		// Update existing
		await db
			.update(userPreferences)
			.set({
				expectedIncomeAmount: data.expectedIncomeAmount,
				updatedAt: new Date()
			})
			.where(eq(userPreferences.id, prefs[0].id));
	}
}
