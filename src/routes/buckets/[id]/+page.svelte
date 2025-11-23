<script lang="ts">
	import type { PageData } from './$types';
	import Modal from '$lib/components/Modal.svelte';
	import BucketForm from '$lib/components/BucketForm.svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import Button from '$lib/components/Button.svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
	import { format } from 'date-fns';
	import {
		ShoppingCart,
		Fuel,
		Utensils,
		Coffee,
		Popcorn,
		Dumbbell,
		Gamepad2,
		Smartphone,
		Shirt,
		Home,
		Dog,
		Heart
	} from 'lucide-svelte';

	const iconMap: Record<string, any> = {
		'shopping-cart': ShoppingCart,
		'fuel': Fuel,
		'utensils': Utensils,
		'coffee': Coffee,
		'popcorn': Popcorn,
		'dumbbell': Dumbbell,
		'gamepad': Gamepad2,
		'smartphone': Smartphone,
		'shirt': Shirt,
		'home': Home,
		'dog': Dog,
		'heart': Heart
	};

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
				class="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
				aria-label="Back to buckets"
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
			{#if bucket.icon && iconMap[bucket.icon]}
				{@const IconComponent = iconMap[bucket.icon]}
				<div class="text-blue-600 dark:text-blue-400">
					<IconComponent size={32} />
				</div>
			{/if}
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{bucket.name}</h1>
		</div>

		<div class="flex items-center gap-3">
			<Button variant="secondary" onclick={() => (showEditModal = true)}>
				Edit Bucket
			</Button>
			<Button
				variant="secondary"
				onclick={handleDeleteBucket}
				class="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900"
			>
				Delete Bucket
			</Button>
		</div>
	</div>

	{#if currentCycle}
		<!-- Current Cycle Stats -->
		<div class="mb-8 grid gap-4 sm:grid-cols-4">
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<p class="text-sm text-gray-500 dark:text-gray-400">Starting Balance</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
					${currentCycle.startingBalance.toFixed(2)}
				</p>
				{#if currentCycle.carryoverAmount !== 0}
					<p class="mt-1 text-xs {currentCycle.carryoverAmount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
						{currentCycle.carryoverAmount > 0 ? '+' : ''}{currentCycle.carryoverAmount.toFixed(2)} carried over
					</p>
				{/if}
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<p class="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
					${currentCycle.totalSpent.toFixed(2)}
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<p class="text-sm text-gray-500 dark:text-gray-400">Remaining</p>
				<p
					class="mt-1 text-2xl font-semibold {currentCycle.remaining < 0
						? 'text-red-600 dark:text-red-400'
						: 'text-green-600 dark:text-green-400'}"
				>
					${currentCycle.remaining.toFixed(2)}
				</p>
			</div>

			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<p class="text-sm text-gray-500 dark:text-gray-400">Cycle Period</p>
				<p class="mt-1 text-sm font-medium text-gray-900 dark:text-gray-100">
					{format(currentCycle.startDate, 'MMM d')} – {format(currentCycle.endDate, 'MMM d, yyyy')}
				</p>
				<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 capitalize">{bucket.frequency}</p>
			</div>
		</div>

		<!-- Progress Bar -->
		<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
			<div class="mb-2 flex items-center justify-between text-sm">
				<span class="text-gray-600 dark:text-gray-400">Budget Progress</span>
				<span class="font-medium text-gray-900 dark:text-gray-100">
					{currentCycle.startingBalance > 0
						? Math.min(
								Math.round((currentCycle.totalSpent / currentCycle.startingBalance) * 100),
								100
							)
						: 0}%
				</span>
			</div>
			<div class="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
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
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Transactions</h2>
			<Button onclick={() => (showAddTransactionModal = true)}>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Add Transaction
			</Button>
		</div>

		{#if currentCycleTransactions.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
				<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">No transactions yet</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Add your first transaction to start tracking.</p>
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
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-900">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Date & Time
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Vendor
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Notes
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Amount
							</th>
							<th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
						{#each currentCycleTransactions as transaction (transaction.id)}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{format(transaction.timestamp, 'MMM d, yyyy h:mm a')}
								</td>
								<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{transaction.vendor || '-'}
								</td>
								<td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
									{transaction.notes || '-'}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
									${transaction.amount.toFixed(2)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm">
									<button
										onclick={() => handleEditTransaction(transaction.id)}
										class="text-blue-600 hover:text-blue-900 mr-3 dark:text-blue-400 dark:hover:text-blue-300"
									>
										Edit
									</button>
									<button
										onclick={() => handleDeleteTransaction(transaction.id)}
										class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
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
			<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Cycle History</h2>
			<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
				<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
					<thead class="bg-gray-50 dark:bg-gray-900">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Period
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Budget
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Carryover
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Spent
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
							>
								Remaining
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
						{#each data.cycles as cycle (cycle.id)}
							{@const startingBalance = cycle.budgetAmount + cycle.carryoverAmount}
							{@const remaining = startingBalance - cycle.totalSpent}
							<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
									{format(cycle.startDate, 'MMM d')} – {format(cycle.endDate, 'MMM d, yyyy')}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
									${cycle.budgetAmount.toFixed(2)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm {cycle.carryoverAmount > 0
										? 'text-green-600 dark:text-green-400'
										: cycle.carryoverAmount < 0
											? 'text-red-600 dark:text-red-400'
											: 'text-gray-500 dark:text-gray-400'}"
								>
									{cycle.carryoverAmount > 0 ? '+' : ''}{cycle.carryoverAmount.toFixed(2)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 dark:text-gray-100">
									${cycle.totalSpent.toFixed(2)}
								</td>
								<td
									class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium {remaining < 0
										? 'text-red-600 dark:text-red-400'
										: 'text-green-600 dark:text-green-400'}"
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
