<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import ExportImportSection from '$lib/components/settings/ExportImportSection.svelte';
	import ResetDataSection from '$lib/components/settings/ResetDataSection.svelte';
	import ResetDataModal from '$lib/components/settings/ResetDataModal.svelte';
	import CategoriesSection from '$lib/components/settings/CategoriesSection.svelte';
	import CategoryFormModal from '$lib/components/settings/CategoryFormModal.svelte';
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
	let showResetModal = $state(false);
	let editingCategoryId = $state<number | null>(null);
	let categoryForm = $state({
		name: '',
		color: '#3B82F6',
		icon: ''
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

	function randomCategoryColor(usedColors: Set<string>): string {
		const palette = [
			'#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
			'#EC4899', '#14B8A6', '#F97316', '#6366F1', '#84CC16',
			'#06B6D4', '#A855F7', '#22C55E', '#FB923C', '#E11D48'
		];
		const available = palette.filter((color) => !usedColors.has(color));
		if (available.length > 0) {
			return available[Math.floor(Math.random() * available.length)];
		}
		let color = '#000000';
		while (usedColors.has(color)) {
			color = `#${Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0')}`.toUpperCase();
		}
		return color;
	}

	function openAddCategoryModal() {
		const usedColors = new Set(data.categories.map((category) => category.color));
		categoryForm = {
			name: '',
			color: randomCategoryColor(usedColors),
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
		<p class="mt-2 text-gray-600 dark:text-gray-400">Manage your categories, appearance, and data</p>
	</div>

	<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
		<h2 class="mb-4 text-xl font-semibold text-gray-900 dark:text-gray-100">Appearance</h2>
		<ThemeSelector />
	</div>

	<CategoriesSection
		categories={data.categories}
		{iconOptions}
		onAdd={openAddCategoryModal}
		onEdit={openEditCategoryModal}
		onDelete={handleDeleteCategory}
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

<!-- Reset Data Modal -->
<ResetDataModal bind:isOpen={showResetModal} onClose={() => (showResetModal = false)} />
