<script lang="ts">
	interface Account {
		id: number;
		name: string;
		accountType: string | null;
		isExternal: boolean;
	}

	let {
		index,
		counterpartyAccountId = $bindable(),
		accounts,
		currentAccountId
	}: {
		index: number;
		counterpartyAccountId: number | undefined;
		accounts: Account[];
		currentAccountId: number | null;
	} = $props();

	// Filter out the current import account so user picks a different one
	const otherAccounts = $derived(
		accounts.filter((a) => a.id !== currentAccountId)
	);
</script>

<div class="space-y-3">
	<p class="text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1">
		This transaction is a transfer between your accounts. It will be excluded from spending/income totals.
	</p>

	<div>
		<label
			for="transferAccount_{index}"
			class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
		>
			Which account was the other side of this transfer?
		</label>
		<select
			id="transferAccount_{index}"
			bind:value={counterpartyAccountId}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		>
			<option value={undefined}>Select an account...</option>
			{#each otherAccounts as account}
				<option value={account.id}>
					{account.name}
					{#if account.accountType}
						({account.accountType.replace('_', ' ')})
					{/if}
					{#if account.isExternal}
						(external)
					{/if}
				</option>
			{/each}
		</select>
	</div>
</div>
