import { addMonths, startOfMonth } from 'date-fns';
import type {
	Debt,
	PayoffSchedule,
	MonthlyPayoffDetail,
	MonthlyDebtPayment,
	PayoffCalculationInput,
	StrategyComparison,
	ConsolidationInput,
	ConsolidationResult
} from '$lib/types/debt';

/**
 * Calculate monthly interest for a debt
 * Matches Excel formula: ROUNDUP(Balance * Rate / 12, 2)
 */
function calculateMonthlyInterest(balance: number, annualRate: number): number {
	const monthlyRate = annualRate / 100 / 12;
	return Math.round(balance * monthlyRate * 100) / 100;
}

/**
 * Sort debts by snowball method (smallest balance first)
 */
export function sortBySnowball(debts: Debt[]): Debt[] {
	return [...debts].sort((a, b) => a.currentBalance - b.currentBalance);
}

/**
 * Sort debts by avalanche method (highest interest rate first)
 */
export function sortByAvalanche(debts: Debt[]): Debt[] {
	return [...debts].sort((a, b) => b.interestRate - a.interestRate);
}

/**
 * Sort debts by custom priority
 */
export function sortByCustom(debts: Debt[], priorityOrder: number[]): Debt[] {
	return [...debts].sort((a, b) => {
		const aIndex = priorityOrder.indexOf(a.id);
		const bIndex = priorityOrder.indexOf(b.id);
		// If not in priority order, put at end
		if (aIndex === -1) return 1;
		if (bIndex === -1) return -1;
		return aIndex - bIndex;
	});
}

/**
 * Calculate payoff schedule using debt avalanche or snowball method
 * Simplified to match Excel's straightforward logic
 */
export function calculatePayoffSchedule(
	debts: Debt[],
	extraPayment: number,
	sortedDebts: Debt[]
): PayoffSchedule {
	// Clone debts to avoid mutation
	const workingDebts = sortedDebts.map((d) => ({
		...d,
		balance: d.currentBalance
	}));

	const timeline: MonthlyPayoffDetail[] = [];
	let month = 0;
	const startDate = new Date();
	let totalInterestPaid = 0;

	// Calculate total minimum payment
	const totalMinimumPayment = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
	const totalMonthlyPayment = totalMinimumPayment + extraPayment;

	while (workingDebts.some((d) => d.balance > 0) && month < 600) {
		// Safety limit: 50 years
		month++;
		const monthDate = addMonths(startOfMonth(startDate), month);
		const monthlyDebts: MonthlyDebtPayment[] = [];

		let availablePayment = totalMonthlyPayment;

		// First pass: pay minimums on all debts and accrue interest
		for (const debt of workingDebts) {
			if (debt.balance <= 0) {
				monthlyDebts.push({
					debtId: debt.id,
					debtName: debt.name,
					payment: 0,
					principal: 0,
					interest: 0,
					remainingBalance: 0
				});
				continue;
			}

			// Calculate interest for the month (matches Excel: balance * rate / 12)
			const interest = calculateMonthlyInterest(debt.balance, debt.interestRate);

			// Minimum payment can't exceed (balance + interest)
			const minimumPayment = Math.min(debt.minimumPayment, debt.balance + interest);
			const principal = Math.max(0, minimumPayment - interest);

			// Apply minimum payment
			debt.balance = Math.max(0, debt.balance - principal);
			availablePayment -= minimumPayment;
			totalInterestPaid += interest;

			monthlyDebts.push({
				debtId: debt.id,
				debtName: debt.name,
				payment: minimumPayment,
				principal,
				interest,
				remainingBalance: debt.balance
			});
		}

		// Second pass: apply extra payment to highest priority debt with balance remaining
		// This matches Excel's waterfall approach
		for (let i = 0; i < workingDebts.length && availablePayment > 0.01; i++) {
			const debt = workingDebts[i];
			if (debt.balance > 0) {
				const extraAmount = Math.min(availablePayment, debt.balance);

				// Apply extra payment to principal
				debt.balance -= extraAmount;
				availablePayment -= extraAmount;

				// Update the monthly debt record
				const debtRecord = monthlyDebts[i];
				debtRecord.payment += extraAmount;
				debtRecord.principal += extraAmount;
				debtRecord.remainingBalance = debt.balance;
			}
		}

		const totalPayment = monthlyDebts.reduce((sum, d) => sum + d.payment, 0);
		const totalInterest = monthlyDebts.reduce((sum, d) => sum + d.interest, 0);
		const totalRemaining = monthlyDebts.reduce((sum, d) => sum + d.remainingBalance, 0);

		timeline.push({
			month,
			date: monthDate,
			debts: monthlyDebts,
			totalPayment,
			totalInterest,
			totalRemaining
		});

		// Stop if all debts paid off
		if (totalRemaining === 0) break;
	}

	const totalPrincipal = debts.reduce((sum, d) => sum + d.currentBalance, 0);

	return {
		strategy: 'custom', // Will be overridden by caller
		timeline,
		totalMonths: month,
		totalInterestPaid,
		totalPrincipalPaid: totalPrincipal,
		debtFreeDate: timeline[timeline.length - 1]?.date || startDate,
		monthlyPayment: totalMonthlyPayment
	};
}

/**
 * Calculate snowball payoff schedule (smallest balance first)
 */
export function calculateSnowballPayoff(debts: Debt[], extraPayment: number): PayoffSchedule {
	const sorted = sortBySnowball(debts);
	const schedule = calculatePayoffSchedule(debts, extraPayment, sorted);
	return { ...schedule, strategy: 'snowball' };
}

/**
 * Calculate avalanche payoff schedule (highest interest first)
 */
export function calculateAvalanchePayoff(debts: Debt[], extraPayment: number): PayoffSchedule {
	const sorted = sortByAvalanche(debts);
	const schedule = calculatePayoffSchedule(debts, extraPayment, sorted);
	return { ...schedule, strategy: 'avalanche' };
}

/**
 * Calculate custom priority payoff schedule
 */
export function calculateCustomPayoff(
	debts: Debt[],
	extraPayment: number,
	priorityOrder: number[]
): PayoffSchedule {
	const sorted = sortByCustom(debts, priorityOrder);
	const schedule = calculatePayoffSchedule(debts, extraPayment, sorted);
	return { ...schedule, strategy: 'custom' };
}

/**
 * Calculate minimum payments only schedule (baseline)
 */
export function calculateMinimumPaymentsOnly(debts: Debt[]): PayoffSchedule {
	const sorted = [...debts]; // Order doesn't matter for minimums only
	const schedule = calculatePayoffSchedule(debts, 0, sorted);
	return { ...schedule, strategy: 'custom' };
}

/**
 * Calculate debt consolidation scenario
 */
export function calculateConsolidation(
	debts: Debt[],
	input: ConsolidationInput,
	extraPayment: number
): ConsolidationResult {
	// Filter debts to consolidate
	const debtsToConsolidate = debts.filter((d) => input.debtIds.includes(d.id));
	const remainingDebts = debts.filter((d) => !input.debtIds.includes(d.id));

	// Calculate consolidated balance
	const consolidatedBalance = debtsToConsolidate.reduce((sum, d) => sum + d.currentBalance, 0);

	// Calculate new minimum payment (default to 2% of balance or provided value)
	const newMinimumPayment =
		input.newMinimumPayment || Math.max(50, consolidatedBalance * 0.02);

	// Create virtual consolidated debt
	const consolidatedDebt: Debt = {
		id: -1, // Virtual ID
		name: 'Consolidated Loan',
		originalBalance: consolidatedBalance,
		currentBalance: consolidatedBalance,
		interestRate: input.newInterestRate,
		minimumPayment: newMinimumPayment,
		linkedBillId: null,
		priority: null,
		notes: 'Consolidated debt',
		createdAt: new Date(),
		updatedAt: new Date()
	};

	// Calculate payoff for consolidated scenario
	const allDebts = [...remainingDebts, consolidatedDebt];
	const consolidatedSchedule = calculateAvalanchePayoff(allDebts, extraPayment);
	consolidatedSchedule.strategy = 'consolidation';

	// Calculate original payoff for comparison
	const originalSchedule = calculateAvalanchePayoff(debts, extraPayment);

	const savings = {
		interestSaved: originalSchedule.totalInterestPaid - consolidatedSchedule.totalInterestPaid,
		monthsSaved: originalSchedule.totalMonths - consolidatedSchedule.totalMonths
	};

	return {
		originalDebts: debtsToConsolidate,
		consolidatedBalance,
		newInterestRate: input.newInterestRate,
		newMinimumPayment,
		payoffSchedule: consolidatedSchedule,
		savings
	};
}

/**
 * Compare all strategies
 */
export function compareStrategies(input: PayoffCalculationInput): StrategyComparison {
	const snowball = calculateSnowballPayoff(input.debts, input.extraMonthlyPayment);
	const avalanche = calculateAvalanchePayoff(input.debts, input.extraMonthlyPayment);
	const current = calculateMinimumPaymentsOnly(input.debts);

	const comparison: StrategyComparison = {
		snowball,
		avalanche,
		current
	};

	// Add custom if priority order provided
	if (input.customPriorityOrder && input.customPriorityOrder.length > 0) {
		comparison.custom = calculateCustomPayoff(
			input.debts,
			input.extraMonthlyPayment,
			input.customPriorityOrder
		);
	}

	// Add consolidation if input provided
	if (input.consolidationInput) {
		comparison.consolidation = calculateConsolidation(
			input.debts,
			input.consolidationInput,
			input.extraMonthlyPayment
		);
	}

	return comparison;
}

/**
 * Get recommended strategy based on comparison
 */
export function getRecommendedStrategy(comparison: StrategyComparison): {
	strategy: string;
	reason: string;
} {
	const { snowball, avalanche, current } = comparison;

	const interestDiff = snowball.totalInterestPaid - avalanche.totalInterestPaid;
	const timeDiff = snowball.totalMonths - avalanche.totalMonths;

	// If avalanche saves significant interest (>$500) or time (>3 months), recommend it
	if (interestDiff > 500 || timeDiff > 3) {
		return {
			strategy: 'avalanche',
			reason: `Saves $${interestDiff.toFixed(2)} in interest and ${timeDiff} months compared to snowball method.`
		};
	}

	// If snowball is faster or very close in interest, recommend for motivation
	if (timeDiff < 0 || Math.abs(interestDiff) < 100) {
		return {
			strategy: 'snowball',
			reason: 'Provides psychological wins by paying off debts faster, with minimal difference in total interest.'
		};
	}

	// Default to avalanche as most mathematically efficient
	return {
		strategy: 'avalanche',
		reason: 'Most mathematically efficient method, minimizing total interest paid.'
	};
}
