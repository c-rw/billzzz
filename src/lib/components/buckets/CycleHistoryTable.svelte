<script lang="ts">
	import { format } from 'date-fns';

	interface Cycle {
		id: number;
		startDate: Date;
		endDate: Date;
		budgetAmount: number;
		carryoverAmount: number;
		totalSpent: number;
	}

	let {
		cycles
	}: {
		cycles: Cycle[];
	} = $props();
</script>

{#if cycles.length > 1}
	<div class="mb-8">
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Cycle History</h2>
		<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
			<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
				<thead class="bg-gray-50 dark:bg-gray-900">
					<tr>
						<th
							class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Period
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Budget
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Carryover
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Spent
						</th>
						<th
							class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
						>
							Remaining
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
					{#each cycles as cycle (cycle.id)}
						{@const startingBalance = cycle.budgetAmount + cycle.carryoverAmount}
						{@const remaining = startingBalance - cycle.totalSpent}
						<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
							<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
								{format(cycle.startDate, 'MMM d')} – {format(cycle.endDate, 'MMM d, yyyy')}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
								${cycle.budgetAmount.toFixed(2)}
							</td>
							<td
								class="whitespace-nowrap px-6 py-4 text-right text-sm {cycle.carryoverAmount > 0
									? 'text-green-600 dark:text-green-400'
									: cycle.carryoverAmount < 0
										? 'text-red-600 dark:text-red-400'
										: 'text-gray-500 dark:text-gray-400'}"
							>
								{cycle.carryoverAmount > 0 ? '+' : ''}{cycle.carryoverAmount.toFixed(2)}
							</td>
							<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
								${cycle.totalSpent.toFixed(2)}
							</td>
							<td
								class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium {remaining < 0
									? 'text-red-600 dark:text-red-400'
									: 'text-green-600 dark:text-green-400'}"
							>
								${remaining.toFixed(2)}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
{/if}
