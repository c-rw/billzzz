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
		transactions,
		onEdit,
		onDelete
	}: {
		transactions: Transaction[];
		onEdit: (id: number) => void;
		onDelete: (id: number) => void;
	} = $props();
</script>

<div class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
	<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
		<thead class="bg-gray-50 dark:bg-gray-900">
			<tr>
				<th
					class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
				>
					Date & Time
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
				>
					Vendor
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
				>
					Notes
				</th>
				<th
					class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
				>
					Amount
				</th>
				<th class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
					Actions
				</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-800">
			{#each transactions as transaction (transaction.id)}
				<tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
					<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
						{format(transaction.timestamp, 'MMM d, yyyy h:mm a')}
					</td>
					<td class="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">
						{transaction.vendor || '-'}
					</td>
					<td class="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
						{transaction.notes || '-'}
					</td>
					<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium text-gray-900 dark:text-gray-100">
						${transaction.amount.toFixed(2)}
					</td>
					<td class="whitespace-nowrap px-6 py-4 text-right text-sm">
						<button
							onclick={() => onEdit(transaction.id)}
							class="text-blue-600 hover:text-blue-900 mr-3 dark:text-blue-400 dark:hover:text-blue-300"
						>
							Edit
						</button>
						<button
							onclick={() => onDelete(transaction.id)}
							class="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
						>
							Delete
						</button>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
