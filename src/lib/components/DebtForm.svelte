<script lang="ts">
	import type { Bill } from '$lib/types/bill';
	import type { PaymentAllocationStrategy } from '$lib/types/debt';
	import RateBucketManager from './RateBucketManager.svelte';

	interface Props {
		bills?: Bill[];
		debtId?: number; // For editing existing debts with rate buckets
		initialData?: {
			name?: string;
			originalBalance?: number;
			currentBalance?: number;
			interestRate?: number;
			minimumPayment?: number;
			linkedBillId?: number | null;
			priority?: number | null;
			paymentAllocationStrategy?: PaymentAllocationStrategy;
			notes?: string;
		};
		rateBuckets?: any[]; // Rate buckets for existing debt
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
		onRateBucketsUpdate?: () => void; // Callback when rate buckets change
		submitLabel?: string;
	}

	let {
		bills = [],
		debtId,
		initialData,
		rateBuckets = [],
		onSubmit,
		onCancel,
		onRateBucketsUpdate,
		submitLabel = 'Save Debt'
	}: Props = $props();

	let name = $state('');
	let originalBalance = $state(0);
	let currentBalance = $state(0);
	let interestRate = $state(0);
	let minimumPayment = $state(0);
	let linkedBillId = $state<number | null>(null);
	let priority = $state<number | null>(null);
	let paymentAllocationStrategy = $state<PaymentAllocationStrategy>('highest-rate-first');
	let notes = $state('');
	let isSubmitting = $state(false);
	let showRateBuckets = $state(false);

	// Reset form when initialData changes
	$effect(() => {
		name = initialData?.name || '';
		originalBalance = initialData?.originalBalance || 0;
		currentBalance = initialData?.currentBalance || 0;
		interestRate = initialData?.interestRate || 0;
		minimumPayment = initialData?.minimumPayment || 0;
		linkedBillId = initialData?.linkedBillId || null;
		priority = initialData?.priority || null;
		paymentAllocationStrategy = initialData?.paymentAllocationStrategy || 'highest-rate-first';
		notes = initialData?.notes || '';
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			await onSubmit({
				name: name.trim(),
				originalBalance: parseFloat(originalBalance.toString()),
				currentBalance: parseFloat(currentBalance.toString()),
				interestRate: parseFloat(interestRate.toString()),
				minimumPayment: parseFloat(minimumPayment.toString()),
				linkedBillId,
				priority,
				paymentAllocationStrategy,
				notes: notes.trim() || null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<label for="name" class="block text-sm font-medium text-gray-700">
			Debt Name <span class="text-red-600">*</span>
		</label>
		<input
			id="name"
			type="text"
			bind:value={name}
			required
			placeholder="Credit Card, Student Loan, etc."
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="originalBalance" class="block text-sm font-medium text-gray-700">
				Original Balance <span class="text-red-600">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm">$</span>
				</div>
				<input
					id="originalBalance"
					type="number"
					step="0.01"
					min="0"
					bind:value={originalBalance}
					required
					class="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div>
			<label for="currentBalance" class="block text-sm font-medium text-gray-700">
				Current Balance <span class="text-red-600">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm">$</span>
				</div>
				<input
					id="currentBalance"
					type="number"
					step="0.01"
					min="0"
					bind:value={currentBalance}
					required
					class="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="interestRate" class="block text-sm font-medium text-gray-700">
				Interest Rate (APR) <span class="text-red-600">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<input
					id="interestRate"
					type="number"
					step="0.01"
					min="0"
					max="100"
					bind:value={interestRate}
					required
					class="block w-full pr-8 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
				<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm">%</span>
				</div>
			</div>
			<p class="mt-1 text-xs text-gray-500">Annual Percentage Rate (e.g., 15.5 for 15.5%)</p>
		</div>

		<div>
			<label for="minimumPayment" class="block text-sm font-medium text-gray-700">
				Minimum Payment <span class="text-red-600">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm">$</span>
				</div>
				<input
					id="minimumPayment"
					type="number"
					step="0.01"
					min="0"
					bind:value={minimumPayment}
					required
					class="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>
	</div>

	<div>
		<label for="linkedBill" class="block text-sm font-medium text-gray-700">
			Link to Bill (Optional)
		</label>
		<select
			id="linkedBill"
			bind:value={linkedBillId}
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		>
			<option value={null}>No linked bill</option>
			{#each bills as bill}
				<option value={bill.id}>{bill.name} - ${bill.amount.toFixed(2)}</option>
			{/each}
		</select>
		<p class="mt-1 text-xs text-gray-500">
			Link this debt to a recurring bill for automatic minimum payment tracking
		</p>
	</div>

	<div>
		<label for="priority" class="block text-sm font-medium text-gray-700">
			Priority (Optional)
		</label>
		<input
			id="priority"
			type="number"
			min="1"
			bind:value={priority}
			placeholder="Used for custom payoff strategy"
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
		<p class="mt-1 text-xs text-gray-500">Lower numbers = higher priority in custom strategy</p>
	</div>

	<div>
		<label for="paymentAllocationStrategy" class="block text-sm font-medium text-gray-700">
			Payment Allocation Strategy
		</label>
		<select
			id="paymentAllocationStrategy"
			bind:value={paymentAllocationStrategy}
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		>
			<option value="highest-rate-first">Highest Rate First (Recommended)</option>
			<option value="lowest-rate-first">Lowest Rate First</option>
			<option value="oldest-first">Oldest Balance First</option>
		</select>
		<p class="mt-1 text-xs text-gray-500">
			How to allocate payments across rate buckets (if using multiple promotional rates)
		</p>
	</div>

	<!-- Rate Buckets Section (only show for existing debts) -->
	{#if debtId}
		<div class="border-t border-gray-200 pt-6">
			<div class="flex items-center justify-between mb-4">
				<div>
					<h3 class="text-lg font-medium text-gray-900">Multiple Promotional Rates</h3>
					<p class="text-sm text-gray-500">
						Configure different interest rates for different balance portions (e.g., balance transfers, purchases)
					</p>
				</div>
				<button
					type="button"
					onclick={() => (showRateBuckets = !showRateBuckets)}
					class="px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
				>
					{showRateBuckets ? 'Hide' : 'Show'} Rate Buckets
				</button>
			</div>

			{#if showRateBuckets}
				<RateBucketManager
					{debtId}
					debtBalance={currentBalance}
					{rateBuckets}
					onUpdate={() => onRateBucketsUpdate?.()}
				/>
			{/if}
		</div>
	{/if}

	<div>
		<label for="notes" class="block text-sm font-medium text-gray-700">Notes (Optional)</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="3"
			placeholder="Add any additional notes about this debt..."
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		></textarea>
	</div>

	<div class="flex justify-end gap-3">
		<button
			type="button"
			onclick={onCancel}
			disabled={isSubmitting}
			class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={isSubmitting}
			class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
		>
			{isSubmitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</form>
