<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';
	import Modal from '$lib/components/Modal.svelte';
	import PaydaySettingsForm from '$lib/components/PaydaySettingsForm.svelte';

	let { data }: { data: PageData } = $props();

	let showAddCategoryModal = $state(false);
	let showEditCategoryModal = $state(false);
	let showPaydaySettingsModal = $state(false);
	let editingCategoryId = $state<number | null>(null);
	let categoryForm = $state({
		name: '',
		color: '#3B82F6',
		icon: ''
	});

	const editingCategory = $derived(
		editingCategoryId !== null ? data.categories.find((c) => c.id === editingCategoryId) : null
	);

	async function handleDeletePayment(id: number, billName: string) {
		if (!confirm(`Are you sure you want to remove this payment for "${billName}"?`)) {
			return;
		}

		try {
			const response = await fetch(`/api/payment-history/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete payment history. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting payment history:', error);
			alert('Failed to delete payment history. Please try again.');
		}
	}

	async function handleSavePaydaySettings(settingsData: any) {
		try {
			const method = data.paydaySettings ? 'PUT' : 'POST';
			const response = await fetch('/api/payday-settings', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settingsData)
			});

			if (response.ok) {
				showPaydaySettingsModal = false;
				await invalidateAll();
			} else {
				alert('Failed to save payday settings. Please try again.');
			}
		} catch (error) {
			console.error('Error saving payday settings:', error);
			alert('Failed to save payday settings. Please try again.');
		}
	}

	async function handleDeletePaydaySettings() {
		if (!confirm('Are you sure you want to remove your payday schedule?')) {
			return;
		}

		try {
			const response = await fetch('/api/payday-settings', {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete payday settings. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting payday settings:', error);
			alert('Failed to delete payday settings. Please try again.');
		}
	}

	function openAddCategoryModal() {
		categoryForm = {
			name: '',
			color: '#3B82F6',
			icon: ''
		};
		showAddCategoryModal = true;
	}

	function openEditCategoryModal(id: number) {
		const category = data.categories.find((c) => c.id === id);
		if (category) {
			categoryForm = {
				name: category.name,
				color: category.color,
				icon: category.icon || ''
			};
			editingCategoryId = id;
			showEditCategoryModal = true;
		}
	}

	async function handleAddCategory() {
		if (!categoryForm.name.trim()) {
			alert('Please enter a category name');
			return;
		}

		try {
			const response = await fetch('/api/categories', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(categoryForm)
			});

			if (response.ok) {
				showAddCategoryModal = false;
				await invalidateAll();
			} else {
				alert('Failed to create category. Please try again.');
			}
		} catch (error) {
			console.error('Error creating category:', error);
			alert('Failed to create category. Please try again.');
		}
	}

	async function handleUpdateCategory() {
		if (!categoryForm.name.trim() || editingCategoryId === null) {
			alert('Please enter a category name');
			return;
		}

		try {
			const response = await fetch(`/api/categories/${editingCategoryId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(categoryForm)
			});

			if (response.ok) {
				showEditCategoryModal = false;
				editingCategoryId = null;
				await invalidateAll();
			} else {
				alert('Failed to update category. Please try again.');
			}
		} catch (error) {
			console.error('Error updating category:', error);
			alert('Failed to update category. Please try again.');
		}
	}

	async function handleDeleteCategory(id: number, name: string) {
		if (!confirm(`Are you sure you want to delete the category "${name}"? This will set all bills in this category to "Uncategorized".`)) {
			return;
		}

		try {
			const response = await fetch(`/api/categories/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete category. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting category:', error);
			alert('Failed to delete category. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Settings - Billzzz</title>
</svelte:head>

<div class="py-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Settings</h1>
			<p class="mt-2 text-gray-600">Manage your payday schedule, categories, and payment history</p>
		</div>

		<!-- Payday Settings Section -->
		<div class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Payday Schedule</h2>
				<p class="mt-1 text-sm text-gray-600">
					Configure your payday schedule to see how much is due before your next paycheck
				</p>
			</div>

			<div class="p-6">
				{#if data.paydaySettings}
					<div class="rounded-lg border border-gray-200 bg-gray-50 p-4">
						<div class="flex items-start justify-between">
							<div>
								<p class="text-sm font-medium text-gray-700">Current Schedule</p>
								<p class="mt-1 text-lg text-gray-900">
									{#if data.paydaySettings.frequency === 'weekly'}
										Every {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][data.paydaySettings.dayOfWeek ?? 0]}
									{:else if data.paydaySettings.frequency === 'biweekly'}
										Every other {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][data.paydaySettings.dayOfWeek ?? 0]}
									{:else if data.paydaySettings.frequency === 'semi-monthly'}
										{data.paydaySettings.dayOfMonth}{data.paydaySettings.dayOfMonth === 1 ? 'st' : data.paydaySettings.dayOfMonth === 2 ? 'nd' : data.paydaySettings.dayOfMonth === 3 ? 'rd' : 'th'} and {data.paydaySettings.dayOfMonth2}{data.paydaySettings.dayOfMonth2 === 1 ? 'st' : data.paydaySettings.dayOfMonth2 === 2 ? 'nd' : data.paydaySettings.dayOfMonth2 === 3 ? 'rd' : 'th'} of each month
									{:else if data.paydaySettings.frequency === 'monthly'}
										{data.paydaySettings.dayOfMonth}{data.paydaySettings.dayOfMonth === 1 ? 'st' : data.paydaySettings.dayOfMonth === 2 ? 'nd' : data.paydaySettings.dayOfMonth === 3 ? 'rd' : 'th'} of each month
									{/if}
								</p>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => (showPaydaySettingsModal = true)}
									class="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
								>
									Edit
								</button>
								<button
									onclick={handleDeletePaydaySettings}
									class="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
								>
									Remove
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900">No payday schedule set</h3>
						<p class="mt-1 text-sm text-gray-500">
							Set up your payday schedule to see bills due before your next paycheck
						</p>
						<button
							onclick={() => (showPaydaySettingsModal = true)}
							class="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
						>
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
							Set Payday Schedule
						</button>
					</div>
				{/if}
			</div>
		</div>

		<!-- Payment History Section -->
		<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-200 px-6 py-4">
				<h2 class="text-xl font-semibold text-gray-900">Payment History</h2>
				<p class="mt-1 text-sm text-gray-600">
					View and manage all payment records. Remove accidental payments here.
				</p>
			</div>

			<div class="p-6">
				{#if data.paymentHistory.length === 0}
					<div class="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-semibold text-gray-900">No payment history</h3>
						<p class="mt-1 text-sm text-gray-500">
							Payment records will appear here when you mark bills as paid.
						</p>
					</div>
				{:else}
					<div class="overflow-hidden">
						<table class="min-w-full divide-y divide-gray-200">
							<thead class="bg-gray-50">
								<tr>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
									>
										Bill Name
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
									>
										Amount
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
									>
										Payment Date
									</th>
									<th
										class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
									>
										Notes
									</th>
									<th class="relative px-6 py-3">
										<span class="sr-only">Actions</span>
									</th>
								</tr>
							</thead>
							<tbody class="divide-y divide-gray-200 bg-white">
								{#each data.paymentHistory as payment (payment.id)}
									<tr class="hover:bg-gray-50">
										<td class="whitespace-nowrap px-6 py-4">
											<div class="text-sm font-medium text-gray-900">{payment.billName}</div>
										</td>
										<td class="whitespace-nowrap px-6 py-4">
											<div class="text-sm text-gray-900">${payment.amount.toFixed(2)}</div>
										</td>
										<td class="whitespace-nowrap px-6 py-4">
											<div class="text-sm text-gray-900">
												{format(payment.paymentDate, 'MMM d, yyyy h:mm a')}
											</div>
										</td>
										<td class="px-6 py-4">
											<div class="text-sm text-gray-500">
												{payment.notes || '-'}
											</div>
										</td>
										<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
											<button
												onclick={() => handleDeletePayment(payment.id, payment.billName)}
												class="text-red-600 hover:text-red-900"
											>
												Remove
											</button>
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>

					<div class="mt-4 text-sm text-gray-500">
						Total records: {data.paymentHistory.length}
					</div>
				{/if}
			</div>
		</div>

		<!-- Categories Section -->
		<div class="mt-8 rounded-lg border border-gray-200 bg-white shadow-sm">
			<div class="border-b border-gray-200 px-6 py-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-xl font-semibold text-gray-900">Categories</h2>
						<p class="mt-1 text-sm text-gray-600">
							Manage your bill categories. Add, edit, or remove categories.
						</p>
					</div>
					<button
						onclick={openAddCategoryModal}
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
						Add Category
					</button>
				</div>
			</div>

			<div class="p-6">
				{#if data.categories.length === 0}
					<div class="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-semibold text-gray-900">No categories</h3>
						<p class="mt-1 text-sm text-gray-500">
							Get started by adding your first category.
						</p>
					</div>
				{:else}
					<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{#each data.categories as category (category.id)}
							<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
								<div class="flex items-start justify-between">
									<div class="flex items-center gap-3">
										<div
											class="flex h-10 w-10 items-center justify-center rounded-lg text-xl"
											style="background-color: {category.color}20; color: {category.color}"
										>
											{category.icon || '📁'}
										</div>
										<div>
											<h3 class="font-medium text-gray-900">{category.name}</h3>
											<p class="text-xs text-gray-500">{category.color}</p>
										</div>
									</div>
									<div class="flex gap-1">
										<button
											onclick={() => openEditCategoryModal(category.id)}
											class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
											title="Edit category"
											aria-label="Edit category"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
												/>
											</svg>
										</button>
										<button
											onclick={() => handleDeleteCategory(category.id, category.name)}
											class="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600"
											title="Delete category"
											aria-label="Delete category"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</button>
									</div>
								</div>
							</div>
						{/each}
					</div>

					<div class="mt-4 text-sm text-gray-500">
						Total categories: {data.categories.length}
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>

<!-- Add Category Modal -->
<Modal bind:isOpen={showAddCategoryModal} onClose={() => (showAddCategoryModal = false)} title="Add New Category">
	<form onsubmit={(e) => { e.preventDefault(); handleAddCategory(); }} class="space-y-4">
		<div>
			<label for="category-name" class="block text-sm font-medium text-gray-700">
				Category Name
			</label>
			<input
				id="category-name"
				type="text"
				bind:value={categoryForm.name}
				required
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="category-icon" class="block text-sm font-medium text-gray-700">
				Icon (emoji)
			</label>
			<input
				id="category-icon"
				type="text"
				bind:value={categoryForm.icon}
				placeholder="📁"
				maxlength="2"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="category-color" class="block text-sm font-medium text-gray-700">
				Color
			</label>
			<div class="mt-1 flex gap-2">
				<input
					id="category-color"
					type="color"
					bind:value={categoryForm.color}
					class="h-10 w-20 rounded-md border-gray-300"
				/>
				<input
					type="text"
					bind:value={categoryForm.color}
					class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<button
				type="submit"
				class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Add Category
			</button>
			<button
				type="button"
				onclick={() => (showAddCategoryModal = false)}
				class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</button>
		</div>
	</form>
</Modal>

<!-- Edit Category Modal -->
<Modal bind:isOpen={showEditCategoryModal} onClose={() => { showEditCategoryModal = false; editingCategoryId = null; }} title="Edit Category">
	<form onsubmit={(e) => { e.preventDefault(); handleUpdateCategory(); }} class="space-y-4">
		<div>
			<label for="edit-category-name" class="block text-sm font-medium text-gray-700">
				Category Name
			</label>
			<input
				id="edit-category-name"
				type="text"
				bind:value={categoryForm.name}
				required
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="edit-category-icon" class="block text-sm font-medium text-gray-700">
				Icon (emoji)
			</label>
			<input
				id="edit-category-icon"
				type="text"
				bind:value={categoryForm.icon}
				placeholder="📁"
				maxlength="2"
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<label for="edit-category-color" class="block text-sm font-medium text-gray-700">
				Color
			</label>
			<div class="mt-1 flex gap-2">
				<input
					id="edit-category-color"
					type="color"
					bind:value={categoryForm.color}
					class="h-10 w-20 rounded-md border-gray-300"
				/>
				<input
					type="text"
					bind:value={categoryForm.color}
					class="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
				/>
			</div>
		</div>

		<div class="flex gap-3 pt-4">
			<button
				type="submit"
				class="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
			>
				Update Category
			</button>
			<button
				type="button"
				onclick={() => { showEditCategoryModal = false; editingCategoryId = null; }}
				class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</button>
		</div>
	</form>
</Modal>

<!-- Payday Settings Modal -->
{#if showPaydaySettingsModal}
	<Modal bind:isOpen={showPaydaySettingsModal} onClose={() => showPaydaySettingsModal = false} title={data.paydaySettings ? "Edit Payday Schedule" : "Set Payday Schedule"}>
		<PaydaySettingsForm
			initialData={data.paydaySettings}
			onSubmit={handleSavePaydaySettings}
			onCancel={() => showPaydaySettingsModal = false}
		/>
	</Modal>
{/if}
