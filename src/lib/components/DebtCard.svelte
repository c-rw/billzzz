<script lang="ts">
	import type { DebtWithDetails } from '$lib/types/debt';
	import { calculateWeightedAverageRate } from '$lib/utils/rate-calculations';

	interface Props {
		debt: DebtWithDetails;
		onEdit: (debt: DebtWithDetails) => void;
		onDelete: (debt: DebtWithDetails) => void;
		onAddPayment: (debt: DebtWithDetails) => void;
	}

	let { debt, onEdit, onDelete, onAddPayment }: Props = $props();

	const percentPaid = $derived(
		debt.originalBalance > 0
			? ((debt.originalBalance - debt.currentBalance) / debt.originalBalance) * 100
			: 0
	);

	const hasRateBuckets = $derived(debt.rateBuckets && debt.rateBuckets.length > 0);

	const effectiveRate = $derived(
		hasRateBuckets && debt.rateBuckets
			? calculateWeightedAverageRate(debt.rateBuckets)
			: debt.interestRate
	);

	const monthlyInterest = $derived((debt.currentBalance * (effectiveRate / 100)) / 12);
</script>

<div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
	<div class="flex justify-between items-start mb-4">
		<div class="flex-1">
			<div class="flex items-center gap-2">
				<h3 class="text-lg font-semibold text-gray-900">{debt.name}</h3>
				{#if hasRateBuckets}
					<span
						class="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800"
						title="This debt has multiple promotional rates"
					>
						{debt.rateBuckets?.length} Rates
					</span>
				{/if}
			</div>
			{#if debt.linkedBill}
				<p class="text-sm text-gray-500 mt-1">
					Linked to: {debt.linkedBill.name}
				</p>
			{/if}
		</div>
		<div class="flex gap-2">
			<button
				onclick={() => onEdit(debt)}
				class="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
				title="Edit debt"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
					/>
				</svg>
			</button>
			<button
				onclick={() => onDelete(debt)}
				class="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
				title="Delete debt"
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

	<div class="space-y-4">
		<!-- Balance Information -->
		<div class="grid grid-cols-2 gap-4">
			<div>
				<p class="text-sm text-gray-500">Current Balance</p>
				<p class="text-2xl font-bold text-gray-900">${debt.currentBalance.toFixed(2)}</p>
			</div>
			<div>
				<p class="text-sm text-gray-500">Original Balance</p>
				<p class="text-lg text-gray-600">${debt.originalBalance.toFixed(2)}</p>
			</div>
		</div>

		<!-- Progress Bar -->
		<div>
			<div class="flex justify-between text-sm mb-1">
				<span class="text-gray-600">Progress</span>
				<span class="font-medium text-gray-900">{percentPaid.toFixed(1)}% paid</span>
			</div>
			<div class="w-full bg-gray-200 rounded-full h-2.5">
				<div
					class="bg-green-600 h-2.5 rounded-full transition-all duration-300"
					style="width: {percentPaid}%"
				></div>
			</div>
		</div>

		<!-- Financial Details -->
		<div class="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200">
			<div>
				<p class="text-xs text-gray-500">
					{hasRateBuckets ? 'Weighted Avg APR' : 'Interest Rate'}
				</p>
				<p class="text-sm font-semibold text-gray-900">{effectiveRate.toFixed(2)}%</p>
				{#if hasRateBuckets}
					<p class="text-xs text-gray-400 mt-0.5">Multiple rates</p>
				{/if}
			</div>
			<div>
				<p class="text-xs text-gray-500">Min Payment</p>
				<p class="text-sm font-semibold text-gray-900">${debt.minimumPayment.toFixed(2)}</p>
			</div>
			<div>
				<p class="text-xs text-gray-500">Monthly Interest</p>
				<p class="text-sm font-semibold text-red-600">${monthlyInterest.toFixed(2)}</p>
				{#if hasRateBuckets}
					<p class="text-xs text-gray-400 mt-0.5">Estimated</p>
				{/if}
			</div>
		</div>

		<!-- Total Paid -->
		{#if debt.totalPaid && debt.totalPaid > 0}
			<div class="pt-4 border-t border-gray-200">
				<p class="text-xs text-gray-500">Total Extra Payments</p>
				<p class="text-sm font-semibold text-green-600">${debt.totalPaid.toFixed(2)}</p>
			</div>
		{/if}

		<!-- Notes -->
		{#if debt.notes}
			<div class="pt-4 border-t border-gray-200">
				<p class="text-sm text-gray-600 italic">{debt.notes}</p>
			</div>
		{/if}

		<!-- Actions -->
		<div class="pt-4 border-t border-gray-200">
			<button
				onclick={() => onAddPayment(debt)}
				class="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors font-medium"
			>
				Make Extra Payment
			</button>
		</div>
	</div>
</div>
