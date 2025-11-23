<script lang="ts">
	import { format } from 'date-fns';
	import Button from '$lib/components/Button.svelte';

	interface Props {
		initialData?: {
			amount?: number;
			timestamp?: Date;
			vendor?: string;
			notes?: string;
		};
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
		submitLabel?: string;
	}

	let {
		initialData,
		onSubmit,
		onCancel,
		submitLabel = 'Add Transaction'
	}: Props = $props();

	let amount = $state(0);
	let timestamp = $state(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
	let vendor = $state('');
	let notes = $state('');
	let isSubmitting = $state(false);

	// Reset form when initialData changes
	$effect(() => {
		amount = initialData?.amount || 0;
		timestamp = initialData?.timestamp
			? format(initialData.timestamp, "yyyy-MM-dd'T'HH:mm")
			: format(new Date(), "yyyy-MM-dd'T'HH:mm");
		vendor = initialData?.vendor || '';
		notes = initialData?.notes || '';
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			await onSubmit({
				amount: parseFloat(amount.toString()),
				timestamp: new Date(timestamp),
				vendor: vendor || null,
				notes: notes || null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- Amount -->
	<div>
		<label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount Spent</label>
		<div class="mt-1 relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<span class="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
			</div>
			<input
				type="number"
				id="amount"
				bind:value={amount}
				required
				min="0"
				step="0.01"
				class="block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 pl-7 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				placeholder="0.00"
			/>
		</div>
	</div>

	<!-- Timestamp -->
	<div>
		<label for="timestamp" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Date & Time</label>
		<input
			type="datetime-local"
			id="timestamp"
			bind:value={timestamp}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		/>
	</div>

	<!-- Vendor -->
	<div>
		<label for="vendor" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Vendor (Optional)</label>
		<input
			type="text"
			id="vendor"
			bind:value={vendor}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="e.g., Walmart, Shell, McDonald's"
		/>
	</div>

	<!-- Notes -->
	<div>
		<label for="notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (Optional)</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="3"
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="Add any additional details..."
		></textarea>
	</div>

	<!-- Form Actions -->
	<div class="flex justify-end gap-3 pt-4">
		<Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : submitLabel}
		</Button>
	</div>
</form>
