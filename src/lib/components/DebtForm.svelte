<script lang="ts">
	import type { Bill } from '$lib/types/bill';
	import Button from '$lib/components/Button.svelte';

	interface Props {
		bills?: Bill[];
		initialData?: {
			name?: string;
			originalBalance?: number;
			currentBalance?: number;
			interestRate?: number;
			minimumPayment?: number;
			linkedBillId?: number | null;
			priority?: number | null;
			notes?: string;
		};
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
		submitLabel?: string;
	}

	let {
		bills = [],
		initialData,
		onSubmit,
		onCancel,
		submitLabel = 'Save Debt'
	}: Props = $props();

	let name = $state('');
	let originalBalance = $state(0);
	let currentBalance = $state(0);
	let interestRate = $state(0);
	let minimumPayment = $state(0);
	let linkedBillId = $state<number | null>(null);
	let priority = $state<number | null>(null);
	let notes = $state('');
	let isSubmitting = $state(false);

	// Reset form when initialData changes
	$effect(() => {
		name = initialData?.name || '';
		originalBalance = initialData?.originalBalance || 0;
		currentBalance = initialData?.currentBalance || 0;
		interestRate = initialData?.interestRate || 0;
		minimumPayment = initialData?.minimumPayment || 0;
		linkedBillId = initialData?.linkedBillId || null;
		priority = initialData?.priority || null;
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
				notes: notes.trim() || null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<div>
		<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Debt Name <span class="text-red-600 dark:text-red-400">*</span>
		</label>
		<input
			id="name"
			type="text"
			bind:value={name}
			required
			placeholder="Credit Card, Student Loan, etc."
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
		/>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="originalBalance" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Original Balance <span class="text-red-600 dark:text-red-400">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
				</div>
				<input
					id="originalBalance"
					type="number"
					step="0.01"
					min="0"
					bind:value={originalBalance}
					required
					class="block w-full pl-7 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>
		</div>

		<div>
			<label for="currentBalance" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Current Balance <span class="text-red-600 dark:text-red-400">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
				</div>
				<input
					id="currentBalance"
					type="number"
					step="0.01"
					min="0"
					bind:value={currentBalance}
					required
					class="block w-full pl-7 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div>
			<label for="interestRate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Interest Rate (APR) <span class="text-red-600 dark:text-red-400">*</span>
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
					class="block w-full pr-8 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
				<div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm dark:text-gray-400">%</span>
				</div>
			</div>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Annual Percentage Rate (e.g., 15.5 for 15.5%)</p>
		</div>

		<div>
			<label for="minimumPayment" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Minimum Payment <span class="text-red-600 dark:text-red-400">*</span>
			</label>
			<div class="mt-1 relative rounded-md shadow-sm">
				<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
					<span class="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
				</div>
				<input
					id="minimumPayment"
					type="number"
					step="0.01"
					min="0"
					bind:value={minimumPayment}
					required
					class="block w-full pl-7 rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>
		</div>
	</div>

	<div>
		<label for="linkedBill" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Link to Bill (Optional)
		</label>
		<select
			id="linkedBill"
			bind:value={linkedBillId}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		>
			<option value={null}>No linked bill</option>
			{#each bills as bill}
				<option value={bill.id}>{bill.name} - ${bill.amount.toFixed(2)}</option>
			{/each}
		</select>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
			Link this debt to a recurring bill for automatic minimum payment tracking
		</p>
	</div>

	<div>
		<label for="priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Priority (Optional)
		</label>
		<input
			id="priority"
			type="number"
			min="1"
			bind:value={priority}
			placeholder="Used for custom payoff strategy"
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
		/>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Lower numbers = higher priority in custom strategy</p>
	</div>

	<div>
		<label for="notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="3"
			placeholder="Add any additional notes about this debt..."
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
		></textarea>
	</div>

	<div class="flex justify-end gap-3">
		<Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : submitLabel}
		</Button>
	</div>
</form>
