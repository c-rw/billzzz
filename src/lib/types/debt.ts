import type { Debt, DebtPayment, DebtStrategySettings, Bill } from '$lib/server/db/schema';

// Strategy types
export type PayoffStrategy = 'snowball' | 'avalanche' | 'custom' | 'consolidation';

// Extended debt type with linked bill and payment history
export interface DebtWithDetails extends Debt {
	linkedBill?: Bill | null;
	payments?: DebtPayment[];
	totalPaid?: number;
	// Total overpayment amount auto-applied from bill payments
	totalOverpaymentApplied?: number;
}

// Monthly payment breakdown for a single debt
export interface MonthlyDebtPayment {
	debtId: number;
	debtName: string;
	payment: number;
	principal: number;
	interest: number;
	remainingBalance: number;
}

// Complete month breakdown in payoff timeline
export interface MonthlyPayoffDetail {
	month: number;
	date: Date;
	debts: MonthlyDebtPayment[];
	totalPayment: number;
	totalInterest: number;
	totalRemaining: number;
}

// Complete payoff schedule for a strategy
export interface PayoffSchedule {
	strategy: PayoffStrategy;
	timeline: MonthlyPayoffDetail[];
	totalMonths: number;
	totalInterestPaid: number;
	totalPrincipalPaid: number;
	debtFreeDate: Date;
	monthlyPayment: number; // Total monthly payment amount
}

// Comparison between different strategies
export interface StrategyComparison {
	snowball: PayoffSchedule;
	avalanche: PayoffSchedule;
	current?: PayoffSchedule; // Current minimum payments only
	custom?: PayoffSchedule;
	consolidation?: ConsolidationResult;
}

// Consolidation modeling
export interface ConsolidationInput {
	debtIds: number[];
	newInterestRate: number;
	newMinimumPayment?: number;
}

export interface ConsolidationResult {
	originalDebts: Debt[];
	consolidatedBalance: number;
	newInterestRate: number;
	newMinimumPayment: number;
	payoffSchedule: PayoffSchedule;
	savings: {
		interestSaved: number;
		monthsSaved: number;
	};
}

// Calculator input for backend calculations
export interface PayoffCalculationInput {
	debts: Debt[];
	strategy: PayoffStrategy;
	extraMonthlyPayment: number;
	customPriorityOrder?: number[];
	consolidationInput?: ConsolidationInput;
}

// Export database types
export type { Debt, DebtPayment, DebtStrategySettings };
