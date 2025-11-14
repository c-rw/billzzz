<script lang="ts">
	import { format } from 'date-fns';

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
		<label for="amount" class="block text-sm font-medium text-gray-700">Amount Spent</label>
		<div class="mt-1 relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<span class="text-gray-500 sm:text-sm">$</span>
			</div>
			<input
				type="number"
				id="amount"
				bind:value={amount}
				required
				min="0"
				step="0.01"
				class="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500"
				placeholder="0.00"
				autofocus
			/>
		</div>
	</div>

	<!-- Timestamp -->
	<div>
		<label for="timestamp" class="block text-sm font-medium text-gray-700">Date & Time</label>
		<input
			type="datetime-local"
			id="timestamp"
			bind:value={timestamp}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
	</div>

	<!-- Vendor -->
	<div>
		<label for="vendor" class="block text-sm font-medium text-gray-700">Vendor (Optional)</label>
		<input
			type="text"
			id="vendor"
			bind:value={vendor}
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			placeholder="e.g., Walmart, Shell, McDonald's"
		/>
	</div>

	<!-- Notes -->
	<div>
		<label for="notes" class="block text-sm font-medium text-gray-700">Notes (Optional)</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="3"
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			placeholder="Add any additional details..."
		></textarea>
	</div>

	<!-- Form Actions -->
	<div class="flex justify-end gap-3 pt-4">
		<button
			type="button"
			onclick={onCancel}
			disabled={isSubmitting}
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={isSubmitting}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{isSubmitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</form>
