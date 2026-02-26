<script lang="ts">
	import type { MappingAction } from '$lib/types/import';

	let {
		index,
		selectedAction,
		transactionType,
		isPotentialTransfer = false,
		onActionChange
	}: {
		index: number;
		selectedAction: MappingAction;
		transactionType: string; // Raw OFX TRNTYPE: 'DEBIT', 'CREDIT', 'XFER', etc.
		isPotentialTransfer?: boolean;
		onActionChange: (action: MappingAction) => void;
	} = $props();

	// CREDITs are money coming IN — they can be income or refunds.
	// DEBITs are money going OUT — they map to bills or buckets.
	const isCredit = $derived(transactionType === 'CREDIT');
</script>

<div class="grid grid-cols-3 gap-2">
	{#if isCredit}
		<!-- CREDIT transactions: income, refund, transfer, or skip -->
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="mark_income"
				checked={selectedAction === 'mark_income'}
				onchange={() => onActionChange('mark_income')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Mark as Income</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="mark_refund"
				checked={selectedAction === 'mark_refund'}
				onchange={() => onActionChange('mark_refund')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Refund</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="mark_transfer"
				checked={selectedAction === 'mark_transfer'}
				onchange={() => onActionChange('mark_transfer')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">
				Transfer
				{#if isPotentialTransfer}
					<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
						Likely
					</span>
				{/if}
			</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="skip"
				checked={selectedAction === 'skip'}
				onchange={() => onActionChange('skip')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Skip</span>
		</label>
	{:else}
		<!-- DEBIT / other transactions: bill, bucket, transfer mapping -->
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="map_existing"
				checked={selectedAction === 'map_existing'}
				onchange={() => onActionChange('map_existing')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Map to Bill</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="create_new"
				checked={selectedAction === 'create_new'}
				onchange={() => onActionChange('create_new')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Create New Bill</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="skip"
				checked={selectedAction === 'skip'}
				onchange={() => onActionChange('skip')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Skip</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="map_to_bucket"
				checked={selectedAction === 'map_to_bucket'}
				onchange={() => onActionChange('map_to_bucket')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Map to Bucket</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="create_new_bucket"
				checked={selectedAction === 'create_new_bucket'}
				onchange={() => onActionChange('create_new_bucket')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">Create New Bucket</span>
		</label>
		<label class="flex items-center">
			<input
				type="radio"
				name="action_{index}"
				value="mark_transfer"
				checked={selectedAction === 'mark_transfer'}
				onchange={() => onActionChange('mark_transfer')}
				class="mr-2"
			/>
			<span class="text-sm dark:text-gray-300">
				Transfer
				{#if isPotentialTransfer}
					<span class="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
						Likely
					</span>
				{/if}
			</span>
		</label>
	{/if}
</div>
