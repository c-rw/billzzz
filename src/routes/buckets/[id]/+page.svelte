<script lang="ts">
	import type { PageData } from './$types';
	import Modal from '$lib/components/Modal.svelte';
	import BucketForm from '$lib/components/BucketForm.svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { format } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let showEditModal = $state(false);
	let showAddTransactionModal = $state(false);
	let showEditTransactionModal = $state(false);
	let editingTransactionId = $state<number | null>(null);

	const bucket = $derived(data.bucket);
	const currentCycle = $derived(bucket.currentCycle);
	const transactions = $derived(data.transactions);

	const editingTransaction = $derived(
		editingTransactionId !== null
			? transactions.find((t) => t.id === editingTransactionId)
			: null
	);

	// Get current cycle transactions
	const currentCycleTransactions = $derived(
		currentCycle
			? transactions.filter((t) => t.cycleId === currentCycle.id)
			: []
	);

	async function handleUpdateBucket(bucketData: any) {
		try {
			const response = await fetch(`/api/buckets/${bucket.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bucketData)
			});

			if (response.ok) {
				showEditModal = false;
				await invalidateAll();
			} else {
				alert('Failed to update bucket. Please try again.');
			}
		} catch (error) {
			console.error('Error updating bucket:', error);
			alert('Failed to update bucket. Please try again.');
		}
	}

	function handleCloseEditModal() {
		showEditModal = false;
	}

	async function handleAddTransaction(transactionData: any) {
		try {
			const response = await fetch(`/api/buckets/${bucket.id}/transactions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(transactionData)
			});

			if (response.ok) {
				showAddTransactionModal = false;
				await invalidateAll();
			} else {
				alert('Failed to add transaction. Please try again.');
			}
		} catch (error) {
			console.error('Error adding transaction:', error);
			alert('Failed to add transaction. Please try again.');
		}
	}

	function handleCloseAddTransactionModal() {
		showAddTransactionModal = false;
	}

	function handleEditTransaction(id: number) {
		editingTransactionId = id;
		showEditTransactionModal = true;
	}

	async function handleUpdateTransaction(transactionData: any) {
		if (editingTransactionId === null) return;

		try {
			const response = await fetch(`/api/transactions/${editingTransactionId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(transactionData)
			});

			if (response.ok) {
				showEditTransactionModal = false;
				editingTransactionId = null;
				await invalidateAll();
			} else {
				alert('Failed to update transaction. Please try again.');
			}
		} catch (error) {
			console.error('Error updating transaction:', error);
			alert('Failed to update transaction. Please try again.');
		}
	}

	function handleCloseEditTransactionModal() {
		showEditTransactionModal = false;
		editingTransactionId = null;
	}

	async function handleDeleteTransaction(id: number) {
		if (!confirm('Are you sure you want to delete this transaction?')) return;

		try {
			const response = await fetch(`/api/transactions/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error deleting transaction:', error);
		}
	}

	async function handleDeleteBucket() {
		if (
			!confirm(
				'Are you sure you want to delete this bucket? Past transactions will be preserved.'
			)
		)
			return;

		try {
			const response = await fetch(`/api/buckets/${bucket.id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				goto('/buckets');
			}
		} catch (error) {
			console.error('Error deleting bucket:', error);
		}
	}
</script>

<svelte:head>
	<title>{bucket.name} - Buckets - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center gap-3 mb-4">
			<button
				onclick={() => goto('/buckets')}
				class="rounded-md p-2 text-gray-500 hover:bg-gray-100"
			>
				<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
			</button>
			{#if bucket.icon}
				<span class="text-3xl">{bucket.icon}</span>
			{/if}
			<h1 class="text-3xl font-bold text-gray-900">{bucket.name}</h1>
		</div>

		<div class="flex items-center gap-3">
			<button
				onclick={() => (showEditModal = true)}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Edit Bucket
			</button>
			<button
				onclick={handleDeleteBucket}
				class="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
			>
				Delete Bucket
			</button>
		</div>
	</div>

	{#if currentCycle}
		<!-- Current Cycle Stats -->
		<div class="mb-8 grid gap-4 sm:grid-cols-4">
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Starting Balance</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900">
					${currentCycle.startingBalance.toFixed(2)}
				</p>
				{#if currentCycle.carryoverAmount !== 0}
					<p class="mt-1 text-xs {currentCycle.carryoverAmount > 0 ? 'text-green-600' : 'text-red-600'}">
						{currentCycle.carryoverAmount > 0 ? '+' : ''}{currentCycle.carryoverAmount.toFixed(2)} carried over
					</p>
				{/if}
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Total Spent</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900">
					${currentCycle.totalSpent.toFixed(2)}
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Remaining</p>
				<p
					class="mt-1 text-2xl font-semibold {currentCycle.remaining < 0
						? 'text-red-600'
						: 'text-green-600'}"
				>
					${currentCycle.remaining.toFixed(2)}
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Cycle Period</p>
				<p class="mt-1 text-sm font-medium text-gray-900">
					{format(currentCycle.startDate, 'MMM d')} – {format(currentCycle.endDate, 'MMM d, yyyy')}
				</p>
				<p class="mt-1 text-xs text-gray-500 capitalize">{bucket.frequency}</p>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
			<div class="mb-2 flex items-center justify-between text-sm">
				<span class="text-gray-600">Budget Progress</span>
				<span class="font-medium text-gray-900">
					{currentCycle.startingBalance > 0
						? Math.min(
								Math.round((currentCycle.totalSpent / currentCycle.startingBalance) * 100),
								100
							)
						: 0}%
				</span>
			</div>
			<div class="h-3 w-full overflow-hidden rounded-full bg-gray-200">
				<div
					class="h-full transition-all {currentCycle.remaining < 0
						? 'bg-red-500'
						: currentCycle.totalSpent / currentCycle.startingBalance > 0.8
							? 'bg-yellow-500'
							: 'bg-green-500'}"
					style="width: {currentCycle.startingBalance > 0
						? Math.min((currentCycle.totalSpent / currentCycle.startingBalance) * 100, 100)
						: 0}%"
				></div>
			</div>
		</div>
	{/if}

	<!-- Transactions Section -->
	<div class="mb-8">
		<div class="mb-4 flex items-center justify-between">
			<h2 class="text-xl font-semibold text-gray-900">Transactions</h2>
			<button
				onclick={() => (showAddTransactionModal = true)}
				class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Add Transaction
			</button>
		</div>

		{#if currentCycleTransactions.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
				<h3 class="text-sm font-semibold text-gray-900">No transactions yet</h3>
				<p class="mt-1 text-sm text-gray-500">Add your first transaction to start tracking.</p>
				<div class="mt-6">
					<button
						onclick={() => (showAddTransactionModal = true)}
						class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Transaction
					</button>
				</div>
			</div>
		{:else}
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Date & Time
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Vendor
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Notes
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Amount
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each currentCycleTransactions as transaction (transaction.id)}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
									{format(transaction.timestamp, 'MMM d, yyyy h:mm a')}
								</td>
								<td class="px-6 py-4 text-sm text-gray-900">
									{transaction.vendor || '-'}
								</td>
								<td class="px-6 py-4 text-sm text-gray-500">
									{transaction.notes || '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900">
									${transaction.amount.toFixed(2)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm">
									<button
										onclick={() => handleEditTransaction(transaction.id)}
										class="text-blue-600 hover:text-blue-900 mr-3"
									>
										Edit
									</button>
									<button
										onclick={() => handleDeleteTransaction(transaction.id)}
										class="text-red-600 hover:text-red-900"
									>
										Delete
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/if}
	</div>

	<!-- Cycle History -->
	{#if data.cycles.length > 1}
		<div class="mb-8">
			<h2 class="mb-4 text-xl font-semibold text-gray-900">Cycle History</h2>
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Period
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Budget
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Carryover
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Spent
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Remaining
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each data.cycles as cycle (cycle.id)}
							{@const startingBalance = cycle.budgetAmount + cycle.carryoverAmount}
							{@const remaining = startingBalance - cycle.totalSpent}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
									{format(cycle.startDate, 'MMM d')} – {format(cycle.endDate, 'MMM d, yyyy')}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
									${cycle.budgetAmount.toFixed(2)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm {cycle.carryoverAmount > 0
										? 'text-green-600'
										: cycle.carryoverAmount < 0
											? 'text-red-600'
											: 'text-gray-500'}"
								>
									{cycle.carryoverAmount > 0 ? '+' : ''}{cycle.carryoverAmount.toFixed(2)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900">
									${cycle.totalSpent.toFixed(2)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium {remaining < 0
										? 'text-red-600'
										: 'text-green-600'}"
								>
									${remaining.toFixed(2)}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>

<!-- Edit Bucket Modal -->
{#if showEditModal}
	<Modal bind:isOpen={showEditModal} onClose={handleCloseEditModal} title="Edit Bucket">
		<BucketForm
			initialData={{
				name: bucket.name,
				frequency: bucket.frequency,
				budgetAmount: bucket.budgetAmount,
				enableCarryover: bucket.enableCarryover,
				icon: bucket.icon || undefined,
				color: bucket.color || undefined,
				anchorDate: bucket.anchorDate
			}}
			onSubmit={handleUpdateBucket}
			onCancel={handleCloseEditModal}
			submitLabel="Update Bucket"
		/>
	</Modal>
{/if}

<!-- Add Transaction Modal -->
{#if showAddTransactionModal}
	<Modal
		bind:isOpen={showAddTransactionModal}
		onClose={handleCloseAddTransactionModal}
		title="Add Transaction"
	>
		<TransactionForm
			onSubmit={handleAddTransaction}
			onCancel={handleCloseAddTransactionModal}
			submitLabel="Add Transaction"
		/>
	</Modal>
{/if}

<!-- Edit Transaction Modal -->
{#if editingTransaction}
	<Modal
		bind:isOpen={showEditTransactionModal}
		onClose={handleCloseEditTransactionModal}
		title="Edit Transaction"
	>
		<TransactionForm
			initialData={{
				amount: editingTransaction.amount,
				timestamp: editingTransaction.timestamp,
				vendor: editingTransaction.vendor || undefined,
				notes: editingTransaction.notes || undefined
			}}
			onSubmit={handleUpdateTransaction}
			onCancel={handleCloseEditTransactionModal}
			submitLabel="Update Transaction"
		/>
	</Modal>
{/if}
