<script lang="ts">
	import type { PageData } from './$types';
	import Modal from '$lib/components/Modal.svelte';
	import BucketForm from '$lib/components/BucketForm.svelte';
	import TransactionForm from '$lib/components/TransactionForm.svelte';
	import Button from '$lib/components/Button.svelte';
	import BucketHeader from '$lib/components/buckets/BucketHeader.svelte';
	import BucketStatsCards from '$lib/components/buckets/BucketStatsCards.svelte';
	import BucketProgressBar from '$lib/components/buckets/BucketProgressBar.svelte';
	import EmptyTransactionsState from '$lib/components/buckets/EmptyTransactionsState.svelte';
	import TransactionsTable from '$lib/components/buckets/TransactionsTable.svelte';
	import CycleHistoryTable from '$lib/components/buckets/CycleHistoryTable.svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';
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
	<BucketHeader
		{bucket}
		{iconMap}
		onEdit={() => (showEditModal = true)}
		onDelete={handleDeleteBucket}
	/>

	{#if currentCycle}
		<BucketStatsCards {currentCycle} frequency={bucket.frequency} />
		<BucketProgressBar {currentCycle} />
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
			<EmptyTransactionsState onAddTransaction={() => (showAddTransactionModal = true)} />
		{:else}
			<TransactionsTable
				transactions={currentCycleTransactions}
				onEdit={handleEditTransaction}
				onDelete={handleDeleteTransaction}
			/>
		{/if}
	</div>

	<CycleHistoryTable cycles={data.cycles} />
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
