<script lang="ts">
	interface Bucket {
		id: number;
		name: string;
		icon: string | null;
		budgetAmount: number;
		currentCycle?: {
			budgetAmount: number;
			carryoverAmount: number;
			totalSpent: number;
		} | null;
	}

	interface Bill {
		id: number;
		name: string;
		amount: number;
	}

	let {
		index,
		refundedBucketId = $bindable(),
		refundedBillId = $bindable(),
		refundAmount,
		buckets,
		existingBills
	}: {
		index: number;
		refundedBucketId: number | undefined;
		refundedBillId: number | undefined;
		refundAmount: number;
		buckets: Bucket[];
		existingBills: Bill[];
	} = $props();

	// Track which type the user is refunding to
	let refundTarget: 'bucket' | 'bill' = $state('bucket');

	function handleTargetChange(target: 'bucket' | 'bill') {
		refundTarget = target;
		// Clear the other selection
		if (target === 'bucket') {
			refundedBillId = undefined;
		} else {
			refundedBucketId = undefined;
		}
	}
</script>

<div class="space-y-3">
	<!-- Refund explanation -->
	<p class="text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
		A refund of <strong>${refundAmount.toFixed(2)}</strong> will be credited back, reducing what was spent.
	</p>

	<!-- Target type selection -->
	<div class="flex gap-4">
		<label class="flex items-center text-sm dark:text-gray-300">
			<input
				type="radio"
				name="refundTarget_{index}"
				value="bucket"
				checked={refundTarget === 'bucket'}
				onchange={() => handleTargetChange('bucket')}
				class="mr-2"
			/>
			Refund to a Bucket
		</label>
		<label class="flex items-center text-sm dark:text-gray-300">
			<input
				type="radio"
				name="refundTarget_{index}"
				value="bill"
				checked={refundTarget === 'bill'}
				onchange={() => handleTargetChange('bill')}
				class="mr-2"
			/>
			Refund to a Bill
		</label>
	</div>

	{#if refundTarget === 'bucket'}
		<div>
			<label
				for="refundBucket_{index}"
				class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
			>
				Which bucket gets the credit?
			</label>
			<select
				id="refundBucket_{index}"
				bind:value={refundedBucketId}
				class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
			>
				<option value={undefined}>Select a bucket...</option>
				{#each buckets as bucket}
					{@const totalSpent = bucket.currentCycle?.totalSpent ?? 0}
					<option value={bucket.id}>
						{bucket.name} (${totalSpent.toFixed(2)} spent this cycle)
					</option>
				{/each}
			</select>
		</div>
	{:else}
		<div>
			<label
				for="refundBill_{index}"
				class="block text-xs text-gray-600 dark:text-gray-400 mb-1"
			>
				Which bill gets the credit?
			</label>
			<select
				id="refundBill_{index}"
				bind:value={refundedBillId}
				class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
			>
				<option value={undefined}>Select a bill...</option>
				{#each existingBills as bill}
					<option value={bill.id}>
						{bill.name} (${bill.amount.toFixed(2)})
					</option>
				{/each}
			</select>
		</div>
	{/if}
</div>
