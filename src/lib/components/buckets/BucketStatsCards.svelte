<script lang="ts">
	import { format } from 'date-fns';

	interface CurrentCycle {
		startingBalance: number;
		carryoverAmount: number;
		totalSpent: number;
		remaining: number;
		startDate: Date;
		endDate: Date;
	}

	let {
		currentCycle,
		frequency
	}: {
		currentCycle: CurrentCycle;
		frequency: string;
	} = $props();
</script>

<div class="mb-8 grid gap-4 sm:grid-cols-4">
	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<p class="text-sm text-gray-500 dark:text-gray-400">Starting Balance</p>
		<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
			${currentCycle.startingBalance.toFixed(2)}
		</p>
		{#if currentCycle.carryoverAmount !== 0}
			<p class="mt-1 text-xs {currentCycle.carryoverAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
				{currentCycle.carryoverAmount > 0 ? '+' : ''}{currentCycle.carryoverAmount.toFixed(2)} carried over
			</p>
		{/if}
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<p class="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
		<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
			${currentCycle.totalSpent.toFixed(2)}
		</p>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<p class="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
		<p
			class="mt-1 text-2xl font-semibold {currentCycle.remaining < 0
				? 'text-red-600 dark:text-red-400'
				: 'text-green-600 dark:text-green-400'}"
		>
			${currentCycle.remaining.toFixed(2)}
		</p>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<p class="text-sm text-gray-500 dark:text-gray-400">Cycle Period</p>
		<p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
			{format(currentCycle.startDate, 'MMM d')} – {format(currentCycle.endDate, 'MMM d, yyyy')}
		</p>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">{frequency}</p>
	</div>
</div>
