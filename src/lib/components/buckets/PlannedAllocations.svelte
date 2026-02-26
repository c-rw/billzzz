<script lang="ts">
	import { format } from 'date-fns';
	import { utcDateToLocal } from '$lib/utils/dates';
	import type { BucketAllocation, BucketAllocationFormData } from '$lib/types/bucket';
	import Button from '$lib/components/Button.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import { CalendarPlus, Pencil, Trash2 } from 'lucide-svelte';

	let {
		allocations,
		bucketId,
		onAdd,
		onUpdate,
		onDelete
	}: {
		allocations: BucketAllocation[];
		bucketId: number;
		onAdd: (data: BucketAllocationFormData) => Promise<void>;
		onUpdate: (id: number, data: Partial<BucketAllocationFormData>) => Promise<void>;
		onDelete: (id: number) => Promise<void>;
	} = $props();

	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let editingAllocation = $state<BucketAllocation | null>(null);

	// Form state
	let formAmount = $state(0);
	let formTargetDate = $state('');
	let formNotes = $state('');
	let isSubmitting = $state(false);

	function resetForm() {
		formAmount = 0;
		formTargetDate = '';
		formNotes = '';
	}

	function openAddModal() {
		resetForm();
		// Default to first of next month
		const now = new Date();
		const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
		formTargetDate = format(nextMonth, 'yyyy-MM-dd');
		showAddModal = true;
	}

	function openEditModal(allocation: BucketAllocation) {
		editingAllocation = allocation;
		formAmount = allocation.amount;
		formTargetDate = format(utcDateToLocal(allocation.targetDate), 'yyyy-MM-dd');
		formNotes = allocation.notes || '';
		showEditModal = true;
	}

	async function handleSubmitAdd() {
		if (formAmount <= 0 || !formTargetDate) return;
		isSubmitting = true;
		try {
			await onAdd({
				bucketId,
				amount: formAmount,
				targetDate: new Date(formTargetDate + 'T12:00:00'),
				notes: formNotes || undefined
			});
			showAddModal = false;
			resetForm();
		} finally {
			isSubmitting = false;
		}
	}

	async function handleSubmitEdit() {
		if (!editingAllocation || formAmount <= 0 || !formTargetDate) return;
		isSubmitting = true;
		try {
			await onUpdate(editingAllocation.id, {
				amount: formAmount,
				targetDate: new Date(formTargetDate + 'T12:00:00'),
				notes: formNotes || undefined
			});
			showEditModal = false;
			editingAllocation = null;
			resetForm();
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="mb-8">
	<div class="mb-4 flex items-center justify-between">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Planned Allocations</h2>
		<Button onclick={openAddModal}>
			<CalendarPlus class="h-4 w-4" />
			Add Allocation
		</Button>
	</div>

	{#if allocations.length === 0}
		<div class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-600 dark:bg-gray-800/50">
			<CalendarPlus class="mx-auto h-8 w-8 text-gray-400 dark:text-gray-500" />
			<p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
				No planned allocations yet. Add extra funds for specific months.
			</p>
			<p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
				e.g. +$200 for Thanksgiving groceries, +$150 for vet visit
			</p>
		</div>
	{:else}
		<div class="space-y-2">
			{#each allocations as allocation (allocation.id)}
				<div class="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
					<div class="flex-1">
						<div class="flex items-center gap-3">
							<span class="text-lg font-semibold text-green-600 dark:text-green-400">
								+${allocation.amount.toFixed(2)}
							</span>
							<span class="text-sm text-gray-500 dark:text-gray-400">
								{format(utcDateToLocal(allocation.targetDate), 'MMM yyyy')}
							</span>
						</div>
						{#if allocation.notes}
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">{allocation.notes}</p>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<button
							onclick={() => openEditModal(allocation)}
							class="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
							title="Edit allocation"
						>
							<Pencil class="h-4 w-4" />
						</button>
						<button
							onclick={() => onDelete(allocation.id)}
							class="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400"
							title="Delete allocation"
						>
							<Trash2 class="h-4 w-4" />
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Allocation Modal -->
{#if showAddModal}
	<Modal bind:isOpen={showAddModal} onClose={() => (showAddModal = false)} title="Add Planned Allocation">
		<form onsubmit={handleSubmitAdd} class="space-y-4">
			<div>
				<label for="alloc-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Amount
				</label>
				<div class="relative mt-1">
					<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
					<input
						id="alloc-amount"
						type="number"
						step="0.01"
						min="0.01"
						bind:value={formAmount}
						class="block w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
			</div>

			<div>
				<label for="alloc-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Target Month
				</label>
				<input
					id="alloc-date"
					type="date"
					bind:value={formTargetDate}
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					required
				/>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
					Pick any date within the target cycle period
				</p>
			</div>

			<div>
				<label for="alloc-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Notes (optional)
				</label>
				<input
					id="alloc-notes"
					type="text"
					bind:value={formNotes}
					placeholder="e.g. Thanksgiving groceries"
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
				/>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<Button variant="secondary" onclick={() => (showAddModal = false)}>Cancel</Button>
				<Button type="submit" disabled={isSubmitting || formAmount <= 0}>
					{isSubmitting ? 'Adding...' : 'Add Allocation'}
				</Button>
			</div>
		</form>
	</Modal>
{/if}

<!-- Edit Allocation Modal -->
{#if showEditModal && editingAllocation}
	<Modal bind:isOpen={showEditModal} onClose={() => { showEditModal = false; editingAllocation = null; }} title="Edit Planned Allocation">
		<form onsubmit={handleSubmitEdit} class="space-y-4">
			<div>
				<label for="edit-alloc-amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Amount
				</label>
				<div class="relative mt-1">
					<span class="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">$</span>
					<input
						id="edit-alloc-amount"
						type="number"
						step="0.01"
						min="0.01"
						bind:value={formAmount}
						class="block w-full rounded-md border border-gray-300 bg-white py-2 pl-7 pr-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
						required
					/>
				</div>
			</div>

			<div>
				<label for="edit-alloc-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Target Month
				</label>
				<input
					id="edit-alloc-date"
					type="date"
					bind:value={formTargetDate}
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
					required
				/>
			</div>

			<div>
				<label for="edit-alloc-notes" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Notes (optional)
				</label>
				<input
					id="edit-alloc-notes"
					type="text"
					bind:value={formNotes}
					placeholder="e.g. Thanksgiving groceries"
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
				/>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<Button variant="secondary" onclick={() => { showEditModal = false; editingAllocation = null; }}>Cancel</Button>
				<Button type="submit" disabled={isSubmitting || formAmount <= 0}>
					{isSubmitting ? 'Saving...' : 'Save Changes'}
				</Button>
			</div>
		</form>
	</Modal>
{/if}
