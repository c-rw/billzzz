<script lang="ts">
	import { format } from 'date-fns';

	interface Transaction {
		id: number;
		timestamp: Date;
		vendor: string | null;
		notes: string | null;
		amount: number;
	}

	let {
		transaction,
		onEdit,
		onDelete
	}: {
		transaction: Transaction;
		onEdit: (id: number) => void;
		onDelete: (id: number) => void;
	} = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
	<div class="flex items-start justify-between">
		<div class="flex-1">
			<p class="font-medium text-gray-900 dark:text-gray-100">
				{transaction.vendor || 'Transaction'}
			</p>
			<p class="text-sm text-gray-500 dark:text-gray-400">
				{format(transaction.timestamp, 'MMM d, yyyy h:mm a')}
			</p>
		</div>
		<p class="text-lg font-bold text-gray-900 dark:text-gray-100">
			${transaction.amount.toFixed(2)}
		</p>
	</div>

	{#if transaction.notes}
		<details class="mt-3">
			<summary class="cursor-pointer text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
				View Notes
			</summary>
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
				{transaction.notes}
			</p>
		</details>
	{/if}

	<div class="mt-4 flex gap-2">
		<button
			onclick={() => onEdit(transaction.id)}
			class="flex-1 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white min-h-11 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-700 dark:hover:bg-blue-800"
		>
			Edit
		</button>
		<button
			onclick={() => onDelete(transaction.id)}
			class="flex-1 rounded-md bg-red-600 px-4 py-3 text-sm font-medium text-white min-h-11 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:bg-red-700 dark:hover:bg-red-800"
		>
			Delete
		</button>
	</div>
</div>
