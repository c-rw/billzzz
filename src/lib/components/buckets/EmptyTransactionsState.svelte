<script lang="ts">
	let {
		onAddTransaction
	}: {
		onAddTransaction: () => void;
	} = $props();
</script>

<div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center dark:border-gray-600 dark:bg-gray-800">
	<h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">No transactions yet</h3>
	<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Add your first transaction to start tracking.</p>
	<div class="mt-6">
		<button
			onclick={onAddTransaction}
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
			Add Transaction
		</button>
	</div>
</div>
