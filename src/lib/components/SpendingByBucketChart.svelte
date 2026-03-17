<script lang="ts">
	import type { SpendingByBucket } from '$lib/server/db/analytics-queries';
	import { formatCurrency } from '$lib/utils/format';

	let { data }: { data: SpendingByBucket[] } = $props();

	const maxSpent = $derived(data.length > 0 ? Math.max(...data.map((b) => b.totalSpent)) : 0);
</script>

{#if data.length === 0}
	<p class="text-sm text-gray-500 dark:text-gray-400">No spending data for this period.</p>
{:else}
	<div class="space-y-3">
		{#each data as bucket}
			{@const pct = maxSpent > 0 ? (bucket.totalSpent / maxSpent) * 100 : 0}
			<div>
				<div class="mb-1 flex items-center justify-between gap-4">
					<span class="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
						{bucket.bucketName}
					</span>
					<span class="whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
						{formatCurrency(bucket.totalSpent)}
					</span>
				</div>
				<div class="h-3 w-full rounded-full bg-gray-100 dark:bg-gray-700">
					<div
						class="h-3 rounded-full transition-all {bucket.isUncategorized
							? 'bg-gray-400 dark:bg-gray-500'
							: bucket.isBills
								? 'bg-blue-500 dark:bg-blue-400'
								: 'bg-green-500 dark:bg-green-400'}"
						style="width: {pct}%"
					></div>
				</div>
			</div>
		{/each}
	</div>

	<div class="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
		<span class="flex items-center gap-1.5">
			<span class="inline-block h-2.5 w-2.5 rounded-full bg-green-500 dark:bg-green-400"></span>
			Bucket
		</span>
		<span class="flex items-center gap-1.5">
			<span class="inline-block h-2.5 w-2.5 rounded-full bg-blue-500 dark:bg-blue-400"></span>
			Bills
		</span>
		<span class="flex items-center gap-1.5">
			<span class="inline-block h-2.5 w-2.5 rounded-full bg-gray-400 dark:bg-gray-500"></span>
			Uncategorized
		</span>
	</div>
{/if}
