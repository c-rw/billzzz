<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { DebtWithDetails } from '$lib/types/debt';
	import { format } from 'date-fns';

	interface Props {
		debt: DebtWithDetails | null;
		isOpen: boolean;
		onClose: () => void;
		onSubmit: (amount: number, date: Date, notes: string) => Promise<void>;
	}

	let { debt, isOpen, onClose, onSubmit }: Props = $props();

	let amount = $state(0);
	let paymentDate = $state(format(new Date(), 'yyyy-MM-dd'));
	let notes = $state('');
	let isSubmitting = $state(false);

	// Reset form when modal opens
	$effect(() => {
		if (isOpen) {
			amount = 0;
			paymentDate = format(new Date(), 'yyyy-MM-dd');
			notes = '';
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		if (!debt) return;

		isSubmitting = true;
		try {
			const [year, month, day] = paymentDate.split('-').map(Number);
			const localDate = new Date(year, month - 1, day);

			await onSubmit(parseFloat(amount.toString()), localDate, notes.trim());
		} finally {
			isSubmitting = false;
		}
	}
</script>

<Modal {isOpen} {onClose} title="Record Debt Payment">
	{#if debt}
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="bg-gray-50 p-4 rounded-md">
				<h4 class="font-medium text-gray-900 mb-2">{debt.name}</h4>
				<p class="text-sm text-gray-600">
					Current Balance: <span class="font-semibold">${debt.currentBalance.toFixed(2)}</span>
				</p>
				<p class="text-sm text-gray-600">
					Minimum Payment: <span class="font-semibold">${debt.minimumPayment.toFixed(2)}</span>
				</p>
			</div>

			<div>
				<label for="paymentAmount" class="block text-sm font-medium text-gray-700">
					Payment Amount <span class="text-red-600">*</span>
				</label>
				<div class="mt-1 relative rounded-md shadow-sm">
					<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
						<span class="text-gray-500 sm:text-sm">$</span>
					</div>
					<input
						id="paymentAmount"
						type="number"
						step="0.01"
						min="0.01"
						max={debt.currentBalance}
						bind:value={amount}
						required
						class="block w-full pl-7 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
					/>
				</div>
				<p class="mt-1 text-xs text-gray-500">
					Extra payment beyond regular minimum. Maximum: ${debt.currentBalance.toFixed(2)}
				</p>
			</div>

			<div>
				<label for="paymentDate" class="block text-sm font-medium text-gray-700">
					Payment Date <span class="text-red-600">*</span>
				</label>
				<input
					id="paymentDate"
					type="date"
					bind:value={paymentDate}
					required
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>

			<div>
				<label for="paymentNotes" class="block text-sm font-medium text-gray-700">
					Notes (Optional)
				</label>
				<textarea
					id="paymentNotes"
					bind:value={notes}
					rows="2"
					placeholder="Add any notes about this payment..."
					class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				></textarea>
			</div>

			<div class="flex justify-end gap-3 pt-4">
				<button
					type="button"
					onclick={onClose}
					disabled={isSubmitting}
					class="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={isSubmitting || amount <= 0 || amount > debt.currentBalance}
					class="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
				>
					{isSubmitting ? 'Recording...' : 'Record Payment'}
				</button>
			</div>
		</form>
	{/if}
</Modal>
