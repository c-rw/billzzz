<script lang="ts">
	import type { Category } from '$lib/types/bill';
	import type { RecurrenceType } from '$lib/types/bill';
	import { format } from 'date-fns';
	import Button from '$lib/components/Button.svelte';

	interface Props {
		categories: Category[];
		initialData?: {
			name?: string;
			amount?: number;
			dueDate?: Date;
			paymentLink?: string;
			categoryId?: number | null;
			isRecurring?: boolean;
			recurrenceType?: RecurrenceType | null;
			recurrenceDay?: number | null;
			isAutopay?: boolean;
			notes?: string;
		};
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
		submitLabel?: string;
	}

	let {
		categories,
		initialData,
		onSubmit,
		onCancel,
		submitLabel = 'Save Bill'
	}: Props = $props();

	let name = $state('');
	let amount = $state(0);
	let dueDate = $state(format(new Date(), 'yyyy-MM-dd'));
	let paymentLink = $state('');
	let categoryId = $state<number | null>(null);
	let isRecurring = $state(false);
	let recurrenceType = $state<RecurrenceType | null>('monthly');
	let recurrenceDay = $state<number | null>(null);
	let isAutopay = $state(false);
	let notes = $state('');
	let isSubmitting = $state(false);

	// Reset form when initialData changes
	$effect(() => {
		name = initialData?.name || '';
		amount = initialData?.amount || 0;
		dueDate = initialData?.dueDate ? format(initialData.dueDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');
		paymentLink = initialData?.paymentLink || '';
		categoryId = initialData?.categoryId || null;
		isRecurring = initialData?.isRecurring || false;
		recurrenceType = initialData?.recurrenceType || 'monthly';
		recurrenceDay = initialData?.recurrenceDay || null;
		isAutopay = initialData?.isAutopay || false;
		notes = initialData?.notes || '';
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			// Parse date as local time to avoid timezone issues
			const [year, month, day] = dueDate.split('-').map(Number);
			const localDate = new Date(year, month - 1, day);

			await onSubmit({
				name,
				amount: parseFloat(amount.toString()),
				dueDate: localDate,
				paymentLink: paymentLink || null,
				categoryId,
				isRecurring,
				recurrenceType: isRecurring ? recurrenceType : null,
				recurrenceDay: isRecurring && (recurrenceType === 'monthly' || recurrenceType === 'quarterly') ? recurrenceDay : null,
				isAutopay,
				notes: notes || null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Bill Name -->
	<div>
		<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Bill Name <span class="text-red-500 dark:text-red-400">*</span>
		</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="e.g., Electric Bill"
		/>
	</div>

	<!-- Amount -->
	<div>
		<label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Amount <span class="text-red-500 dark:text-red-400">*</span>
		</label>
		<div class="relative mt-1">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<span class="text-gray-500 dark:text-gray-400">$</span>
			</div>
			<input
				type="number"
				id="amount"
				bind:value={amount}
				required
				min="0"
				step="0.01"
				class="block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				placeholder="0.00"
			/>
		</div>
	</div>

	<!-- Due Date -->
	<div>
		<label for="dueDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Due Date <span class="text-red-500 dark:text-red-400">*</span>
		</label>
		<input
			type="date"
			id="dueDate"
			bind:value={dueDate}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		/>
	</div>

	<!-- Payment Link -->
	<div>
		<label for="paymentLink" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Payment Link (Optional)
		</label>
		<input
			type="url"
			id="paymentLink"
			bind:value={paymentLink}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="https://example.com/pay"
		/>
	</div>

	<!-- Category -->
	<div>
		<label for="category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
		<select
			id="category"
			bind:value={categoryId}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		>
			<option value={null}>No Category</option>
			{#each categories as category}
				<option value={category.id}>
					{category.icon} {category.name}
				</option>
			{/each}
		</select>
	</div>

	<!-- Autopay -->
	<div class="flex items-center">
		<input
			type="checkbox"
			id="isAutopay"
			bind:checked={isAutopay}
			class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
		/>
		<label for="isAutopay" class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
			This bill is set to autopay
		</label>
	</div>

	<!-- Recurring -->
	<div class="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
		<div class="flex items-center">
			<input
				type="checkbox"
				id="isRecurring"
				bind:checked={isRecurring}
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
			/>
			<label for="isRecurring" class="ml-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
				This is a recurring bill
			</label>
		</div>

		{#if isRecurring}
			<div class="space-y-4">
				<div>
					<label for="recurrenceType" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Frequency
					</label>
					<select
						id="recurrenceType"
						bind:value={recurrenceType}
						class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					>
						<option value="weekly">Weekly</option>
						<option value="biweekly">Every 2 Weeks</option>
						<option value="monthly">Monthly</option>
						<option value="quarterly">Quarterly</option>
						<option value="yearly">Yearly</option>
					</select>
				</div>

				{#if recurrenceType === 'monthly' || recurrenceType === 'quarterly'}
					<div>
						<label for="recurrenceDay" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Day of Month
						</label>
						<input
							type="number"
							id="recurrenceDay"
							bind:value={recurrenceDay}
							min="1"
							max="31"
							class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
							placeholder="e.g., 1 for 1st of month"
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							Leave empty to use the same day as the initial due date
						</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Notes -->
	<div>
		<label for="notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Notes (Optional)
		</label>
		<textarea
			id="notes"
			bind:value={notes}
			rows="3"
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="Any additional information..."
		></textarea>
	</div>

	<!-- Actions -->
	<div class="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
		<Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : submitLabel}
		</Button>
	</div>
</form>
