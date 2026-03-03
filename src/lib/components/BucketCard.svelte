<script lang="ts">
	import type { BucketWithCycle } from '$lib/types/bucket';
	import { format } from 'date-fns';
		import { bucketIconMap as iconMap } from '$lib/utils/icons';

	interface Props {
		bucket: BucketWithCycle;
		onEdit?: (id: number) => void;
		onDelete?: (id: number) => void;
		onClick?: (id: number) => void;
	}

	let { bucket, onEdit, onDelete, onClick }: Props = $props();

	const currentCycle = $derived(bucket.currentCycle);
	const remaining = $derived(currentCycle ? currentCycle.remaining : 0);
	const totalSpent = $derived(currentCycle ? currentCycle.totalSpent : 0);
	const startingBalance = $derived(currentCycle ? currentCycle.startingBalance : bucket.budgetAmount);

	// Calculate percentage spent
	const percentSpent = $derived(startingBalance > 0 ? (totalSpent / startingBalance) * 100 : 0);

	// Determine color based on spending status
	const statusColor = $derived.by(() => {
		if (remaining < 0) return 'text-red-600';
		if (percentSpent > 80) return 'text-yellow-600';
		return 'text-green-600';
	});

	const progressColor = $derived.by(() => {
		if (remaining < 0) return 'bg-red-500';
		if (percentSpent > 80) return 'bg-yellow-500';
		return 'bg-green-500';
	});

	function handleEdit() {
		if (onEdit) {
			onEdit(bucket.id);
		}
	}

	function handleDelete() {
		if (onDelete && confirm('Are you sure you want to delete this bucket?')) {
			onDelete(bucket.id);
		}
	}

	function handleClick() {
		if (onClick) {
			onClick(bucket.id);
		}
	}
</script>

<div
	class="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md cursor-pointer dark:border-gray-700 dark:bg-gray-800"
	onclick={handleClick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			handleClick();
		}
	}}
	role="button"
	tabindex="0"
>
	<div class="p-4">
		<div class="mb-2 flex items-center justify-between gap-2">
			<div class="flex items-center gap-2">
				{#if bucket.icon && iconMap[bucket.icon]}
					{@const IconComponent = iconMap[bucket.icon]}
					<div class="text-blue-600 dark:text-blue-400">
						<IconComponent size={20} />
					</div>
				{/if}
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{bucket.name}</h3>
			</div>
			{#if bucket.enableCarryover}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-400"
					title="Carryover enabled"
				>
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M8.445 14.832A1 1 0 0010 14v-2.798l5.445 3.63A1 1 0 0017 14V6a1 1 0 00-1.555-.832L10 8.798V6a1 1 0 00-1.555-.832l-6 4a1 1 0 000 1.664l6 4z"
						/>
					</svg>
					Carryover
				</span>
			{/if}
		</div>

		{#if currentCycle}
			<div class="mb-3 flex items-center justify-between text-xs">
				<span class="text-gray-500 dark:text-gray-400">
					{format(currentCycle.startDate, 'MMM d')} – {format(currentCycle.endDate, 'MMM d, yyyy')}
				</span>
				<div class="flex items-center gap-1.5">
					{#if remaining < 0}
						<span class="rounded bg-red-100 px-1.5 py-0.5 font-medium text-red-700 dark:bg-red-950 dark:text-red-400">Over</span>
					{/if}
					{#if currentCycle.carryoverAmount !== 0}
						<span class="rounded px-1.5 py-0.5 font-medium {currentCycle.carryoverAmount > 0 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'}">
							{currentCycle.carryoverAmount > 0 ? '+' : ''}{currentCycle.carryoverAmount.toFixed(0)} carry
						</span>
					{/if}
					{#if currentCycle.allocatedAmount > 0}
						<span class="rounded bg-blue-100 px-1.5 py-0.5 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-400">
							+${currentCycle.allocatedAmount.toFixed(0)} planned
						</span>
					{/if}
				</div>
			</div>
		{/if}

		<!-- Remaining Amount -->
		<div class="mb-3">
			<div class="flex items-baseline justify-between">
				<span class="text-2xl font-bold {statusColor}">${Math.abs(remaining).toFixed(2)}</span>
				<span class="text-sm text-gray-500 dark:text-gray-400">remaining</span>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="mb-3">
			<div class="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
				<div
					class="{progressColor} h-full transition-all"
					style="width: {Math.min(percentSpent, 100)}%"
				></div>
			</div>
		</div>

		<!-- Spending Info -->
		<div class="grid grid-cols-2 gap-3 text-sm">
			<div>
				<span class="text-gray-500 dark:text-gray-400">Spent:</span>
				<span class="ml-2 font-semibold text-gray-900 dark:text-gray-100">${totalSpent.toFixed(2)}</span>
			</div>
			<div>
				<span class="text-gray-500 dark:text-gray-400">Budget:</span>
				<span class="ml-2 font-medium text-gray-900 dark:text-gray-100">${startingBalance.toFixed(2)}</span>
			</div>
		</div>
	</div>

	<!-- Action Buttons -->
	<div class="flex items-center justify-end gap-1 border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
		<button
			onclick={(e) => {
				e.stopPropagation();
				handleEdit();
			}}
			class="rounded-md p-3 min-h-11 min-w-11 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
			title="Edit bucket"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
				/>
			</svg>
		</button>
		<button
			onclick={(e) => {
				e.stopPropagation();
				handleDelete();
			}}
			class="rounded-md p-3 min-h-11 min-w-11 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
			title="Delete bucket"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
				/>
			</svg>
		</button>
	</div>
</div>
