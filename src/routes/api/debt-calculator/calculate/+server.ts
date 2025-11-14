import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllDebts } from '$lib/server/db/debt-queries';
import {
	compareStrategies,
	getRecommendedStrategy
} from '$lib/server/utils/debt-calculator';
import type { PayoffCalculationInput } from '$lib/types/debt';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const input: Partial<PayoffCalculationInput> = await request.json();

		// Get debts from database if not provided
		const debts = input.debts || getAllDebts();

		if (debts.length === 0) {
			return json({ error: 'No debts to calculate' }, { status: 400 });
		}

		// Validate input
		const extraPayment = input.extraMonthlyPayment || 0;
		if (extraPayment < 0) {
			return json({ error: 'Extra payment must be non-negative' }, { status: 400 });
		}

		const calculationInput: PayoffCalculationInput = {
			debts,
			strategy: input.strategy || 'snowball',
			extraMonthlyPayment: extraPayment,
			customPriorityOrder: input.customPriorityOrder,
			consolidationInput: input.consolidationInput
		};

		const comparison = compareStrategies(calculationInput);
		const recommended = getRecommendedStrategy(comparison);

		return json({
			comparison,
			recommended
		});
	} catch (error) {
		console.error('Error calculating payoff:', error);
		return json({ error: 'Failed to calculate payoff' }, { status: 500 });
	}
};
