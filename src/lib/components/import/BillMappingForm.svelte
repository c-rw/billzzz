<script lang="ts">
	import type { Category } from '$lib/types/bill';

	let {
		index,
		billName = $bindable(),
		dueDate = $bindable(),
		categoryId = $bindable(),
		isRecurring = $bindable(),
		categories
	}: {
		index: number;
		billName: string | undefined;
		dueDate: string | undefined;
		categoryId: number | undefined;
		isRecurring: boolean | undefined;
		categories: Category[];
	} = $props();
</script>

<div class="grid grid-cols-2 gap-3">
	<div>
		<label for="billName_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Bill Name
		</label>
		<input
			id="billName_{index}"
			type="text"
			bind:value={billName}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		/>
	</div>
	<div>
		<label for="category_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Category
		</label>
		<select
			id="category_{index}"
			bind:value={categoryId}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		>
			<option value={undefined}>None</option>
			{#each categories as cat}
				<option value={cat.id}>{cat.name}</option>
			{/each}
		</select>
	</div>
	<div>
		<label for="dueDate_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Due Date
		</label>
		<input
			id="dueDate_{index}"
			type="date"
			bind:value={dueDate}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		/>
	</div>
	<div>
		<label for="recurring_{index}" class="flex items-center text-xs text-gray-600 dark:text-gray-400 mt-4">
			<input
				id="recurring_{index}"
				type="checkbox"
				bind:checked={isRecurring}
				class="mr-2"
			/>
			Recurring Bill
		</label>
	</div>
</div>
