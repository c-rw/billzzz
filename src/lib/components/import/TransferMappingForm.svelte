<script lang="ts">
	import type { Category } from '$lib/types/bill';

	interface Account {
		id: number;
		name: string;
		isExternal: boolean;
	}

	let {
		index,
		counterpartyAccountId = $bindable(),
		transferCategoryId = $bindable(),
		accounts,
		categories
	}: {
		index: number;
		counterpartyAccountId: number | undefined;
		transferCategoryId: number | undefined;
		accounts: Account[];
		categories: Category[];
	} = $props();
</script>

<div class="grid grid-cols-2 gap-3">
	<div>
		<label
			for="counterpartyAccount_{index}"
			class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
		>
			Transfer with account
		</label>
		<select
			id="counterpartyAccount_{index}"
			bind:value={counterpartyAccountId}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		>
			<option value={undefined}>Select an account...</option>
			{#each accounts as account}
				<option value={account.id}>
					{account.name}{account.isExternal ? ' (external)' : ''}
				</option>
			{/each}
		</select>
	</div>

	<div>
		<label
			for="transferCategory_{index}"
			class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
		>
			Category (optional)
		</label>
		<select
			id="transferCategory_{index}"
			bind:value={transferCategoryId}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		>
			<option value={undefined}>None</option>
			{#each categories as cat}
				<option value={cat.id}>{cat.name}</option>
			{/each}
		</select>
	</div>
</div>
