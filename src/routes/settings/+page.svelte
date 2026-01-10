<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import Modal from '$lib/components/Modal.svelte';
	import PaydaySettingsForm from '$lib/components/PaydaySettingsForm.svelte';
	import PaydaySettingsSection from '$lib/components/settings/PaydaySettingsSection.svelte';
	import ExportImportSection from '$lib/components/settings/ExportImportSection.svelte';
	import ResetDataSection from '$lib/components/settings/ResetDataSection.svelte';
	import ResetDataModal from '$lib/components/settings/ResetDataModal.svelte';
	import CategoriesSection from '$lib/components/settings/CategoriesSection.svelte';
	import CategoryFormModal from '$lib/components/settings/CategoryFormModal.svelte';
	import AccountsSection from '$lib/components/settings/AccountsSection.svelte';
	import AccountFormModal from '$lib/components/settings/AccountFormModal.svelte';
	import ThemeSelector from '$lib/components/ThemeSelector.svelte';
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

	let { data }: { data: PageData } = $props();

	let showAddCategoryModal = $state(false);
	let showEditCategoryModal = $state(false);
	let showAddAccountModal = $state(false);
	let showEditAccountModal = $state(false);
	let showPaydaySettingsModal = $state(false);
	let showResetModal = $state(false);
	let editingCategoryId = $state<number | null>(null);
	let editingAccountId = $state<number | null>(null);
	let categoryForm = $state({
		name: '',
		color: '#3B82F6',
		icon: ''
	});
	let accountForm = $state({
		name: '',
		isExternal: false
	});

	// Icon options for categories (same as buckets)
	const iconOptions = [
		{ id: 'shopping-cart', component: ShoppingCart, label: 'Groceries' },
		{ id: 'fuel', component: Fuel, label: 'Gas' },
		{ id: 'utensils', component: Utensils, label: 'Food' },
		{ id: 'coffee', component: Coffee, label: 'Coffee' },
		{ id: 'popcorn', component: Popcorn, label: 'Entertainment' },
		{ id: 'dumbbell', component: Dumbbell, label: 'Fitness' },
		{ id: 'gamepad', component: Gamepad2, label: 'Gaming' },
		{ id: 'smartphone', component: Smartphone, label: 'Tech' },
		{ id: 'shirt', component: Shirt, label: 'Clothing' },
		{ id: 'home', component: Home, label: 'Home' },
		{ id: 'dog', component: Dog, label: 'Pets' },
		{ id: 'heart', component: Heart, label: 'Health' }
	];

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
		if (
			!confirm(
				`Are you sure you want to delete the category "${name}"? This will set all bills in this category to "Uncategorized".`
			)
		) {
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

	function openAddAccountModal() {
		accountForm = {
			name: '',
			isExternal: false
		};
		showAddAccountModal = true;
	}

	function openEditAccountModal(id: number) {
		const account = data.accounts.find((a) => a.id === id);
		if (account) {
			accountForm = {
				name: account.name,
				isExternal: account.isExternal
			};
			editingAccountId = id;
			showEditAccountModal = true;
		}
	}

	async function handleAddAccount() {
		if (!accountForm.name.trim()) {
			alert('Please enter an account name');
			return;
		}

		try {
			const response = await fetch('/api/accounts', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(accountForm)
			});

			if (response.ok) {
				showAddAccountModal = false;
				await invalidateAll();
			} else {
				alert('Failed to create account. Please try again.');
			}
		} catch (error) {
			console.error('Error creating account:', error);
			alert('Failed to create account. Please try again.');
		}
	}

	async function handleUpdateAccount() {
		if (!accountForm.name.trim() || editingAccountId === null) {
			alert('Please enter an account name');
			return;
		}

		try {
			const response = await fetch(`/api/accounts/${editingAccountId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(accountForm)
			});

			if (response.ok) {
				showEditAccountModal = false;
				editingAccountId = null;
				await invalidateAll();
			} else {
				alert('Failed to update account. Please try again.');
			}
		} catch (error) {
			console.error('Error updating account:', error);
			alert('Failed to update account. Please try again.');
		}
	}

	async function handleDeleteAccount(id: number, name: string) {
		if (
			!confirm(
				`Are you sure you want to delete the account "${name}"? This will remove all transfer associations with this account.`
			)
		) {
			return;
		}

		try {
			const response = await fetch(`/api/accounts/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete account. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting account:', error);
			alert('Failed to delete account. Please try again.');
		}
	}

	async function handleExport() {
		try {
			window.location.href = '/api/export';
		} catch (error) {
			console.error('Export error:', error);
			alert('Failed to export data. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Settings - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">Manage your payday schedule, categories, and payment history</p>
	</div>

	<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
		<ThemeSelector />
	</div>

	<PaydaySettingsSection
		paydaySettings={data.paydaySettings}
		onEdit={() => (showPaydaySettingsModal = true)}
		onDelete={handleDeletePaydaySettings}
	/>

	<CategoriesSection
		categories={data.categories}
		{iconOptions}
		onAdd={openAddCategoryModal}
		onEdit={openEditCategoryModal}
		onDelete={handleDeleteCategory}
	/>

	<AccountsSection
		accounts={data.accounts}
		onAdd={openAddAccountModal}
		onEdit={openEditAccountModal}
		onDelete={handleDeleteAccount}
	/>

	<ExportImportSection onExport={handleExport} />

	<ResetDataSection onReset={() => (showResetModal = true)} />
</div>

<!-- Add Category Modal -->
<CategoryFormModal
	bind:isOpen={showAddCategoryModal}
	mode="add"
	bind:categoryForm
	{iconOptions}
	onSubmit={handleAddCategory}
	onCancel={() => (showAddCategoryModal = false)}
/>

<!-- Edit Category Modal -->
<CategoryFormModal
	bind:isOpen={showEditCategoryModal}
	mode="edit"
	bind:categoryForm
	{iconOptions}
	onSubmit={handleUpdateCategory}
	onCancel={() => {
		showEditCategoryModal = false;
		editingCategoryId = null;
	}}
/>

<!-- Add Account Modal -->
<AccountFormModal
	bind:isOpen={showAddAccountModal}
	mode="add"
	bind:accountForm
	onSubmit={handleAddAccount}
	onCancel={() => (showAddAccountModal = false)}
/>

<!-- Edit Account Modal -->
<AccountFormModal
	bind:isOpen={showEditAccountModal}
	mode="edit"
	bind:accountForm
	onSubmit={handleUpdateAccount}
	onCancel={() => {
		showEditAccountModal = false;
		editingAccountId = null;
	}}
/>

<!-- Payday Settings Modal -->
{#if showPaydaySettingsModal}
	<Modal
		bind:isOpen={showPaydaySettingsModal}
		onClose={() => (showPaydaySettingsModal = false)}
		title={data.paydaySettings ? 'Edit Payday Schedule' : 'Set Payday Schedule'}
	>
		<PaydaySettingsForm
			initialData={data.paydaySettings}
			onSubmit={handleSavePaydaySettings}
			onCancel={() => (showPaydaySettingsModal = false)}
		/>
	</Modal>
{/if}

<!-- Reset Data Modal -->
<ResetDataModal bind:isOpen={showResetModal} onClose={() => (showResetModal = false)} />
