<script lang="ts">
	import type { StrategyComparison as ComparisonType } from '$lib/types/debt';
	import { format } from 'date-fns';

	interface Props {
		comparison: ComparisonType;
		recommended?: { strategy: string; reason: string };
	}

	let { comparison, recommended }: Props = $props();

	const strategies = $derived([
		{ name: 'Snowball', data: comparison.snowball, key: 'snowball' },
		{ name: 'Avalanche', data: comparison.avalanche, key: 'avalanche' },
		...(comparison.custom ? [{ name: 'Custom', data: comparison.custom, key: 'custom' }] : []),
		...(comparison.current ? [{ name: 'Minimum Payments', data: comparison.current, key: 'current' }] : [])
	]);

	// Find best strategy by interest
	const bestByInterest = $derived(
		strategies.reduce((best, current) =>
			current.data.totalInterestPaid < best.data.totalInterestPaid ? current : best
		)
	);

	// Find best strategy by time
	const bestByTime = $derived(
		strategies.reduce((best, current) =>
			current.data.totalMonths < best.data.totalMonths ? current : best
		)
	);
</script>

<div class="space-y-6">
	<!-- Recommendation Banner -->
	{#if recommended}
		<div class="bg-green-50 dark:bg-green-950 border-l-4 border-green-500 dark:border-green-600 p-4 rounded-r-lg">
			<div class="flex">
				<div class="shrink-0">
					<svg class="h-5 w-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
				</div>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-green-800 dark:text-green-200">
						Recommended: {recommended.strategy.charAt(0).toUpperCase() + recommended.strategy.slice(1)} Method
					</h3>
					<p class="mt-1 text-sm text-green-700 dark:text-green-300">{recommended.reason}</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Comparison Cards -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-{strategies.length > 2 ? '4' : '2'} gap-4">
		{#each strategies as strategy}
			{@const isRecommended = recommended?.strategy === strategy.key}
			{@const isBestInterest = strategy.key === bestByInterest.key}
			{@const isBestTime = strategy.key === bestByTime.key}

			<div
				class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border-2 {isRecommended
					? 'border-green-500 dark:border-green-600'
					: 'border-gray-200 dark:border-gray-700'} hover:shadow-lg transition-shadow"
			>
				<div class="flex justify-between items-start mb-4">
					<h3 class="text-lg font-bold text-gray-900 dark:text-gray-100">{strategy.name}</h3>
					{#if isRecommended}
						<span class="px-2 py-1 text-xs font-medium text-green-800 dark:text-green-200 bg-green-100 dark:bg-green-900 rounded-full">
							Recommended
						</span>
					{/if}
				</div>

				<div class="space-y-4">
					<!-- Debt-Free Date -->
					<div>
						<p class="text-sm text-gray-600 dark:text-gray-400">Debt-Free Date</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{format(strategy.data.debtFreeDate, 'MMM d, yyyy')}
						</p>
						{#if isBestTime && strategy.key !== 'current'}
							<span class="text-xs text-green-600 dark:text-green-400 font-medium">Fastest</span>
						{/if}
					</div>

					<!-- Total Months -->
					<div>
						<p class="text-sm text-gray-600 dark:text-gray-400">Time to Payoff</p>
						<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
							{strategy.data.totalMonths} months
						</p>
						{#if comparison.current && strategy.key !== 'current'}
							{@const monthsSaved = comparison.current.totalMonths - strategy.data.totalMonths}
							{#if monthsSaved > 0}
								<span class="text-xs text-blue-600 dark:text-blue-400">
									{monthsSaved} months faster than minimum payments
								</span>
							{/if}
						{/if}
					</div>

					<!-- Total Interest -->
					<div>
						<p class="text-sm text-gray-600 dark:text-gray-400">Total Interest</p>
						<p class="text-lg font-semibold text-red-600 dark:text-red-400">
							${strategy.data.totalInterestPaid.toFixed(2)}
						</p>
						{#if isBestInterest && strategy.key !== 'current'}
							<span class="text-xs text-green-600 dark:text-green-400 font-medium">Lowest Interest</span>
						{/if}
						{#if comparison.current && strategy.key !== 'current'}
							{@const interestSaved = comparison.current.totalInterestPaid - strategy.data.totalInterestPaid}
							{#if interestSaved > 0}
								<span class="text-xs text-green-600 dark:text-green-400">
									Save ${interestSaved.toFixed(2)} vs minimum payments
								</span>
							{/if}
						{/if}
					</div>

					<!-- Monthly Payment -->
					<div class="pt-4 border-t border-gray-200 dark:border-gray-700">
						<p class="text-sm text-gray-600 dark:text-gray-400">Monthly Payment</p>
						<p class="text-md font-semibold text-gray-900 dark:text-gray-100">
							${strategy.data.monthlyPayment.toFixed(2)}
						</p>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<!-- Comparison Table -->
	<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
		<div class="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Side-by-Side Comparison</h3>
		</div>
		<div class="overflow-x-auto">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
							Strategy
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
							Months
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
							Total Interest
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
							Total Paid
						</th>
						<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
							Monthly Payment
						</th>
					</tr>
				</thead>
				<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
					{#each strategies as strategy}
						{@const isRecommended = recommended?.strategy === strategy.key}
						<tr class="{isRecommended ? 'bg-green-50 dark:bg-green-950' : 'hover:bg-gray-50 dark:hover:bg-gray-700'} transition-colors">
							<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
								{strategy.name}
								{#if isRecommended}
									<span class="ml-2 text-xs text-green-600 dark:text-green-400">(Recommended)</span>
								{/if}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
								{strategy.data.totalMonths}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
								${strategy.data.totalInterestPaid.toFixed(2)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
								${(strategy.data.totalPrincipalPaid + strategy.data.totalInterestPaid).toFixed(2)}
							</td>
							<td class="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-gray-100">
								${strategy.data.monthlyPayment.toFixed(2)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>
