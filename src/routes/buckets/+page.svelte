<script lang="ts">
	import type { PageData } from './$types';
	import BucketCard from '$lib/components/BucketCard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import BucketForm from '$lib/components/BucketForm.svelte';
	import Button from '$lib/components/Button.svelte';
	import { invalidateAll } from '$app/navigation';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let editingBucketId = $state<number | null>(null);

	const editingBucket = $derived(
		editingBucketId !== null ? data.buckets.find((b) => b.id === editingBucketId) : null
	);

	async function handleAddBucket(bucketData: any) {
		try {
			const response = await fetch('/api/buckets', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bucketData)
			});

			if (response.ok) {
				showAddModal = false;
				await invalidateAll();
			} else {
				alert('Failed to create bucket. Please try again.');
			}
		} catch (error) {
			console.error('Error creating bucket:', error);
			alert('Failed to create bucket. Please try again.');
		}
	}

	function handleCloseAddModal() {
		showAddModal = false;
	}

	function handleEdit(id: number) {
		editingBucketId = id;
		showEditModal = true;
	}

	async function handleUpdateBucket(bucketData: any) {
		if (editingBucketId === null) return;

		try {
			const response = await fetch(`/api/buckets/${editingBucketId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(bucketData)
			});

			if (response.ok) {
				showEditModal = false;
				editingBucketId = null;
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
		editingBucketId = null;
	}

	async function handleDelete(id: number) {
		try {
			const response = await fetch(`/api/buckets/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error deleting bucket:', error);
		}
	}

	function handleBucketClick(id: number) {
		goto(`/buckets/${id}`);
	}

	// Calculate totals
	const totalBudget = $derived(
		data.buckets.reduce((sum, bucket) => {
			const starting = bucket.currentCycle?.startingBalance ?? bucket.budgetAmount;
			return sum + starting;
		}, 0)
	);

	const totalSpent = $derived(
		data.buckets.reduce((sum, bucket) => {
			return sum + (bucket.currentCycle?.totalSpent ?? 0);
		}, 0)
	);

	const totalRemaining = $derived(totalBudget - totalSpent);
</script>

<svelte:head>
	<title>Buckets - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Buckets</h1>
				<p class="mt-2 text-gray-600 dark:text-gray-400">Track your variable spending categories</p>
			</div>
			<Button variant="primary" size="md" onclick={() => (showAddModal = true)}>
				<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 4v16m8-8H4"
					/>
				</svg>
				Add Bucket
			</Button>
		</div>
	</div>

	<!-- Stats Dashboard -->
	<div class="mb-8 grid gap-4 sm:grid-cols-3">
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
			<p class="text-sm text-gray-500 dark:text-gray-400">Total Budget</p>
			<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">${totalBudget.toFixed(2)}</p>
		</div>
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
			<p class="text-sm text-gray-500 dark:text-gray-400">Total Spent</p>
			<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">${totalSpent.toFixed(2)}</p>
		</div>
		<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
			<p class="text-sm text-gray-500 dark:text-gray-400">Total Remaining</p>
			<p
				class="mt-1 text-2xl font-semibold {totalRemaining < 0
					? 'text-red-600 dark:text-red-400'
					: 'text-green-600 dark:text-green-400'}"
			>
				${totalRemaining.toFixed(2)}
			</p>
		</div>
	</div>

	<!-- Buckets List -->
	{#if data.buckets.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-12 text-center">
			<svg
				class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">No buckets found</h3>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Get started by creating your first spending bucket.
			</p>
			<div class="mt-6">
				<Button variant="primary" size="md" onclick={() => (showAddModal = true)}>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Bucket
				</Button>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.buckets as bucket (bucket.id)}
				<BucketCard
					{bucket}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onClick={handleBucketClick}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Add Bucket Modal -->
{#if showAddModal}
	<Modal bind:isOpen={showAddModal} onClose={handleCloseAddModal} title="Add New Bucket">
		<BucketForm onSubmit={handleAddBucket} onCancel={handleCloseAddModal} submitLabel="Add Bucket" />
	</Modal>
{/if}

<!-- Edit Bucket Modal -->
{#if editingBucket}
	<Modal bind:isOpen={showEditModal} onClose={handleCloseEditModal} title="Edit Bucket">
		<BucketForm
			initialData={{
				name: editingBucket.name,
				frequency: editingBucket.frequency,
				budgetAmount: editingBucket.budgetAmount,
				enableCarryover: editingBucket.enableCarryover,
				icon: editingBucket.icon || undefined,
				color: editingBucket.color || undefined,
				anchorDate: editingBucket.anchorDate
			}}
			onSubmit={handleUpdateBucket}
			onCancel={handleCloseEditModal}
			submitLabel="Update Bucket"
		/>
	</Modal>
{/if}
