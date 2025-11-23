<script lang="ts">
	import Modal from './Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { BillWithCategory } from '$lib/types/bill';

	interface Props {
		isOpen: boolean;
		bill: BillWithCategory | null;
		onConfirm: (amount: number) => Promise<void>;
		onCancel: () => void;
	}

	let { isOpen = $bindable(), bill, onConfirm, onCancel }: Props = $props();

	let amount = $state(0);
	let isSubmitting = $state(false);

	// Update amount when bill changes
	$effect(() => {
		if (bill) {
			amount = bill.amount;
		}
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			await onConfirm(parseFloat(amount.toString()));
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if bill}
	<Modal bind:isOpen onClose={onCancel} title="Confirm Payment">
		<form onsubmit={handleSubmit} class="space-y-4">
			<div>
				<p class="text-sm text-gray-600 mb-4">
					You're marking <span class="font-semibold text-gray-900">{bill.name}</span> as paid.
				</p>

				<label for="paymentAmount" class="block text-sm font-medium text-gray-700 mb-1">
					Payment Amount <span class="text-red-500">*</span>
				</label>
				<div class="relative">
					<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
						<span class="text-gray-500">$</span>
					</div>
					<input
						type="number"
						id="paymentAmount"
						bind:value={amount}
						required
						min="0"
						step="0.01"
						class="block w-full rounded-md border-gray-300 pl-7 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						placeholder="0.00"
					/>
				</div>
				<p class="mt-1 text-xs text-gray-500">
					Original bill amount: ${bill.amount.toFixed(2)}
				</p>
			</div>

			<!-- Actions -->
			<div class="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
				<Button
					variant="secondary"
					size="md"
					onclick={onCancel}
					disabled={isSubmitting}
				>
					Cancel
				</Button>
				<Button
					type="submit"
					variant="primary"
					size="md"
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Confirming...' : 'Confirm Payment'}
				</Button>
			</div>
		</form>
	</Modal>
{/if}
