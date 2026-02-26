<script lang="ts">
	import { format } from 'date-fns';
	import { utcDateToLocal } from '$lib/utils/dates';

	interface Allocation {
		amount: number;
		notes: string | null;
	}

	interface CurrentCycle {
		startingBalance: number;
		budgetAmount: number;
		allocatedAmount: number;
		carryoverAmount: number;
		totalSpent: number;
		remaining: number;
		startDate: Date;
		endDate: Date;
		allocations: Allocation[];
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
		{#if currentCycle.allocatedAmount > 0 || currentCycle.carryoverAmount !== 0}
			<div class="mt-1 space-y-0.5">
				{#if currentCycle.allocatedAmount > 0}
					<p class="text-xs text-blue-600 dark:text-blue-400">
						${currentCycle.budgetAmount.toFixed(2)} base + ${currentCycle.allocatedAmount.toFixed(2)} allocated
						{#if currentCycle.allocations.length > 0}
							<span class="text-gray-400 dark:text-gray-500">
								({#each currentCycle.allocations as alloc, i}{#if i > 0}, {/if}{alloc.notes || `+$${alloc.amount.toFixed(2)}`}{/each})
							</span>
						{/if}
					</p>
				{/if}
				{#if currentCycle.carryoverAmount !== 0}
					<p class="text-xs {currentCycle.carryoverAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
						{currentCycle.carryoverAmount > 0 ? '+' : ''}{currentCycle.carryoverAmount.toFixed(2)} carried over
					</p>
				{/if}
			</div>
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
			{format(utcDateToLocal(currentCycle.startDate), 'MMM d')} – {format(utcDateToLocal(currentCycle.endDate), 'MMM d, yyyy')}
		</p>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">{frequency}</p>
	</div>
</div>
