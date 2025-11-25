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
		cycle
	}: {
		cycle: Cycle;
	} = $props();

	const remaining = $derived(cycle.budgetAmount + cycle.carryoverAmount - cycle.totalSpent);
	const percentSpent = $derived(
		cycle.budgetAmount + cycle.carryoverAmount > 0
			? (cycle.totalSpent / (cycle.budgetAmount + cycle.carryoverAmount)) * 100
			: 0
	);

	const statusColor = $derived.by(() => {
		if (remaining < 0) return 'text-red-600 dark:text-red-400';
		if (percentSpent > 80) return 'text-yellow-600 dark:text-yellow-400';
		return 'text-green-600 dark:text-green-400';
	});

	const statusBgColor = $derived.by(() => {
		if (remaining < 0) return 'bg-red-50 dark:bg-red-950';
		if (percentSpent > 80) return 'bg-yellow-50 dark:bg-yellow-950';
		return 'bg-green-50 dark:bg-green-950';
	});
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
	<div class="mb-3">
		<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
			{format(cycle.startDate, 'MMM d')} – {format(cycle.endDate, 'MMM d, yyyy')}
		</p>
	</div>

	<div class="grid grid-cols-2 gap-3 text-sm">
		<div>
			<span class="text-gray-500 dark:text-gray-400">Budget:</span>
			<span class="ml-2 font-semibold text-gray-900 dark:text-gray-100">
				${cycle.budgetAmount.toFixed(2)}
			</span>
		</div>
		<div>
			<span class="text-gray-500 dark:text-gray-400">Spent:</span>
			<span class="ml-2 font-semibold text-gray-900 dark:text-gray-100">
				${cycle.totalSpent.toFixed(2)}
			</span>
		</div>
	</div>

	{#if cycle.carryoverAmount !== 0}
		<div class="mt-2 text-sm">
			<span class="text-gray-500 dark:text-gray-400">Carryover:</span>
			<span class="ml-2 font-medium {cycle.carryoverAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
				{cycle.carryoverAmount > 0 ? '+' : ''}{cycle.carryoverAmount.toFixed(2)}
			</span>
		</div>
	{/if}

	<div class="mt-3 rounded-lg p-3 {statusBgColor}">
		<div class="flex items-center justify-between">
			<span class="text-sm font-medium {statusColor}">Remaining</span>
			<span class="text-lg font-bold {statusColor}">
				${Math.abs(remaining).toFixed(2)}
			</span>
		</div>
		{#if remaining < 0}
			<p class="mt-1 text-xs text-red-600 dark:text-red-400">Overbudget</p>
		{/if}
	</div>
</div>
