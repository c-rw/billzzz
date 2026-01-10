<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import Button from '$lib/components/Button.svelte';

	let { data }: { data: PageData } = $props();

	let name = $state('');
	let isExternal = $state(false);

	let editingId = $state<number | null>(null);
	let editingName = $state('');
	let editingIsExternal = $state(false);

	async function handleCreate() {
		if (!name.trim()) {
			alert('Please enter an account name');
			return;
		}

		const response = await fetch('/api/accounts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name, isExternal })
		});

		if (!response.ok) {
			alert('Failed to create account. Please try again.');
			return;
		}

		name = '';
		isExternal = false;
		await invalidateAll();
	}

	function startEdit(account: any) {
		editingId = account.id;
		editingName = account.name;
		editingIsExternal = account.isExternal;
	}

	function cancelEdit() {
		editingId = null;
		editingName = '';
		editingIsExternal = false;
	}

	async function saveEdit() {
		if (editingId === null) return;
		if (!editingName.trim()) {
			alert('Please enter an account name');
			return;
		}

		const response = await fetch(`/api/accounts/${editingId}`, {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: editingName, isExternal: editingIsExternal })
		});

		if (!response.ok) {
			alert('Failed to update account. Please try again.');
			return;
		}

		cancelEdit();
		await invalidateAll();
	}

	async function handleDelete(id: number, accountName: string) {
		if (!confirm(`Delete account "${accountName}"? Transfers will be unlinked.`)) {
			return;
		}

		const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });

		if (!response.ok) {
			alert('Failed to delete account. Please try again.');
			return;
		}

		await invalidateAll();
	}
</script>

<svelte:head>
	<title>Accounts - Settings - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Create internal (checking/savings) and external (wife/business) accounts for transfer tracking.
		</p>
	</div>

	<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Add Account</h2>

		<div class="grid gap-4 sm:grid-cols-3">
			<label class="sm:col-span-2">
				<div class="mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">Name</div>
				<input
					class="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
					bind:value={name}
					placeholder="Main Checking"
				/>
			</label>

			<label class="flex items-center gap-2 pt-6">
				<input type="checkbox" bind:checked={isExternal} />
				<span class="text-sm text-gray-700 dark:text-gray-300">External</span>
			</label>
		</div>

		<div class="mt-4 flex justify-end">
			<Button variant="primary" onclick={handleCreate}>Add Account</Button>
		</div>
	</div>

	<div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Accounts</h2>
		</div>

		<div class="divide-y divide-gray-200 dark:divide-gray-700">
			{#if data.accounts.length === 0}
				<div class="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
					No accounts yet.
				</div>
			{:else}
				{#each data.accounts as account (account.id)}
					<div class="px-6 py-4">
						{#if editingId === account.id}
							<div class="grid items-center gap-4 sm:grid-cols-5">
								<input
									class="sm:col-span-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
									bind:value={editingName}
								/>
								<label class="flex items-center gap-2 sm:col-span-1">
									<input type="checkbox" bind:checked={editingIsExternal} />
									<span class="text-sm text-gray-700 dark:text-gray-300">External</span>
								</label>
								<div class="sm:col-span-2 flex justify-end gap-2">
									<Button variant="primary" size="sm" onclick={saveEdit}>Save</Button>
									<Button variant="secondary" size="sm" onclick={cancelEdit}>Cancel</Button>
								</div>
							</div>
						{:else}
							<div class="flex items-center justify-between">
								<div>
									<div class="font-medium text-gray-900 dark:text-gray-100">{account.name}</div>
									<div class="text-sm text-gray-600 dark:text-gray-400">
										{account.isExternal ? 'External account' : 'Internal account'}
									</div>
								</div>
								<div class="flex gap-2">
									<Button variant="secondary" size="sm" onclick={() => startEdit(account)}>
										Edit
									</Button>
									<Button
										variant="danger"
										size="sm"
										onclick={() => handleDelete(account.id, account.name)}
									>
										Delete
									</Button>
								</div>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
