<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';

	type IconOption = {
		id: string;
		component: any;
		label: string;
	};

	type CategoryForm = {
		name: string;
		color: string;
		icon: string;
	};

	let {
		isOpen = $bindable(),
		mode,
		categoryForm = $bindable(),
		iconOptions,
		onSubmit,
		onCancel
	}: {
		isOpen: boolean;
		mode: 'add' | 'edit';
		categoryForm: CategoryForm;
		iconOptions: IconOption[];
		onSubmit: () => void;
		onCancel: () => void;
	} = $props();

	let iconSearchQuery = $state('');

	const filteredIconOptions = $derived(
		iconSearchQuery.trim() === ''
			? iconOptions
			: iconOptions.filter(
					(option) =>
						option.label.toLowerCase().includes(iconSearchQuery.toLowerCase()) ||
						option.id.toLowerCase().includes(iconSearchQuery.toLowerCase())
				)
	);

	const title = mode === 'add' ? 'Add New Category' : 'Edit Category';
	const submitLabel = mode === 'add' ? 'Add Category' : 'Update Category';
</script>

<Modal bind:isOpen onClose={onCancel} {title}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSubmit();
		}}
		class="space-y-4"
	>
		<div>
			<label
				for="{mode}-category-name"
				class="block text-sm font-medium text-gray-700"
			>
				Category Name
			</label>
			<input
				id="{mode}-category-name"
				type="text"
				bind:value={categoryForm.name}
				required
				class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			/>
		</div>

		<div>
			<div class="block text-sm font-medium text-gray-700 mb-2">Icon (Optional)</div>
			<input
				type="text"
				bind:value={iconSearchQuery}
				placeholder="Search icons..."
				class="mb-3 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
			/>
			<div class="grid grid-cols-6 gap-2">
				{#each filteredIconOptions as option}
					{@const IconComponent = option.component}
					<button
						type="button"
						onclick={() => (categoryForm.icon = option.id)}
						class="p-3 rounded-md border-2 transition-all {categoryForm.icon === option.id
							? 'border-blue-500 bg-blue-50 text-blue-700'
							: 'border-gray-200 hover:border-gray-300 text-gray-600'}"
						title={option.label}
					>
						<IconComponent size={24} />
					</button>
				{/each}
			</div>
			{#if filteredIconOptions.length === 0}
				<p class="mt-2 text-sm text-gray-500 text-center">No icons found</p>
			{/if}
			{#if categoryForm.icon}
				<button
					type="button"
					onclick={() => (categoryForm.icon = '')}
					class="mt-2 text-xs text-gray-500 hover:text-gray-700"
				>
					Clear selection
				</button>
			{/if}
		</div>

		<div>
			<label for="{mode}-category-color" class="block text-sm font-medium text-gray-700">
				Color
			</label>
			<div class="mt-1 flex gap-2">
				<input
					id="{mode}-category-color"
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
				{submitLabel}
			</button>
			<button
				type="button"
				onclick={onCancel}
				class="flex-1 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
			>
				Cancel
			</button>
		</div>
	</form>
</Modal>
