<script lang="ts">
	import { format, differenceInDays, startOfDay } from 'date-fns';
	import { utcDateToLocal } from '$lib/utils/dates';

	interface Allocation {
		amount: number;
		targetDate: Date;
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

	const today = startOfDay(new Date());

	// Compute daily savings rate and progress for each allocation
	const allocationSavings = $derived(
		currentCycle.allocations
			.filter(a => a.targetDate > today)
			.map(a => {
				const daysUntil = differenceInDays(startOfDay(a.targetDate), today);
				const dailySavings = daysUntil > 0 ? a.amount / daysUntil : 0;
				const monthlySavings = dailySavings * 30;
				return { ...a, daysUntil, dailySavings, monthlySavings };
			})
	);

	const totalDailySavings = $derived(
		allocationSavings.reduce((sum, a) => sum + a.dailySavings, 0)
	);
</script>

<div class="mb-8 grid gap-4 sm:grid-cols-4">
	<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<p class="text-sm text-gray-500 dark:text-gray-400">Starting Balance</p>
		<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
			${currentCycle.startingBalance.toFixed(2)}
		</p>
		{#if currentCycle.allocatedAmount > 0 || currentCycle.carryoverAmount !== 0}
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				${currentCycle.budgetAmount.toFixed(2)} base
				{#if currentCycle.allocatedAmount > 0}
					<span class="text-blue-600 dark:text-blue-400">+ ${currentCycle.allocatedAmount.toFixed(2)} allocated</span>
				{/if}
				{#if currentCycle.carryoverAmount !== 0}
					<span class="{currentCycle.carryoverAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
						{currentCycle.carryoverAmount > 0 ? '+' : ''} ${Math.abs(currentCycle.carryoverAmount).toFixed(2)} carryover
					</span>
				{/if}
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
			{format(utcDateToLocal(currentCycle.startDate), 'MMM d')} – {format(utcDateToLocal(currentCycle.endDate), 'MMM d, yyyy')}
		</p>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">{frequency}</p>
	</div>
</div>

{#if allocationSavings.length > 0}
	<div class="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
		<p class="text-sm font-medium text-blue-800 dark:text-blue-300 mb-2">
			Saving ${totalDailySavings.toFixed(2)}/day for planned allocations
		</p>
		<div class="space-y-1.5">
			{#each allocationSavings as alloc}
				<div class="flex items-center justify-between text-xs">
					<span class="text-blue-700 dark:text-blue-400">
						{alloc.notes || `$${alloc.amount.toFixed(2)} allocation`}
						<span class="text-blue-500 dark:text-blue-500">
							— due {format(utcDateToLocal(alloc.targetDate), 'MMM d, yyyy')} ({alloc.daysUntil}d)
						</span>
					</span>
					<span class="font-medium text-blue-800 dark:text-blue-300">
						~${alloc.monthlySavings.toFixed(0)}/mo
					</span>
				</div>
			{/each}
		</div>
	</div>
{/if}
