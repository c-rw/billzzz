<script lang="ts">
	import { FileText } from 'lucide-svelte';
	import MappingActionSelector from './MappingActionSelector.svelte';
	import type { MappingAction } from '$lib/types/import';
	import BillMappingForm from './BillMappingForm.svelte';
	import BucketMappingForm from './BucketMappingForm.svelte';
	import TransferMappingForm from './TransferMappingForm.svelte';
	import RefundMappingForm from './RefundMappingForm.svelte';
	import type { Category, BillWithCategory } from '$lib/types/bill';
	import { formatDateForInput } from '$lib/utils/dates';

	interface Transaction {
		id: number;
		payee: string;
		amount: number;
		datePosted: Date;
		memo?: string | null;
		transactionType: string; // Raw OFX TRNTYPE: 'DEBIT', 'CREDIT', 'XFER', etc.
		isPotentialTransfer: boolean;
	}

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

	interface Account {
		id: number;
		name: string;
		isExternal: boolean;
	}

	interface TransactionMapping {
		transactionId: number;
		action: MappingAction;
		billId?: number;
		billName?: string;
		amount: number;
		dueDate?: string;
		categoryId?: number;
		isRecurring?: boolean;
		bucketId?: number;
		bucketName?: string;
		budgetAmount?: number;
		frequency?: string;
		anchorDate?: string;
		counterpartyAccountId?: number;
		transferCategoryId?: number;
		refundedBucketId?: number;
		refundedBillId?: number;
	}

	let {
		transaction,
		index,
		mapping = $bindable(),
		existingBills,
		buckets,
		categories,
		accounts,
		iconMap
	}: {
		transaction: Transaction;
		index: number;
		mapping: TransactionMapping;
		existingBills: BillWithCategory[];
		buckets: Bucket[];
		categories: Category[];
		accounts: Account[];
		iconMap: Record<string, any>;
	} = $props();

	// Determine default action based on transaction type
	const isCredit = $derived(transaction.transactionType === 'CREDIT');

	function handleActionChange(action: MappingAction) {
		if (action === 'create_new_bucket') {
			mapping = {
				...mapping,
				action,
				bucketName: transaction.payee,
				budgetAmount: transaction.amount,
				frequency: 'monthly',
				anchorDate: formatDateForInput(new Date(transaction.datePosted))
			};
		} else {
			mapping = { ...mapping, action };
		}
	}

	// Badge label for transaction type
	const typeBadge = $derived(
		transaction.transactionType === 'CREDIT'
			? { label: 'Credit / Income', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
			: transaction.transactionType === 'XFER'
				? { label: 'Transfer', cls: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' }
				: null
	);
</script>

<div
	class="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
>
	<div class="grid grid-cols-12 gap-4">
		<!-- Transaction Info -->
		<div class="col-span-12 md:col-span-4">
			<div class="flex items-start">
				<FileText class="h-5 w-5 text-gray-400 dark:text-gray-500 mr-3 mt-0.5" />
				<div class="flex-1">
					<div class="flex items-center gap-2 flex-wrap">
						<p class="font-medium text-gray-900 dark:text-gray-100">{transaction.payee}</p>
						{#if typeBadge}
							<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium {typeBadge.cls}">
								{typeBadge.label}
							</span>
						{/if}
					</div>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{new Date(transaction.datePosted).toLocaleDateString()}
					</p>
					{#if transaction.memo}
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">{transaction.memo}</p>
					{/if}
					<p class="text-lg font-semibold mt-1 {isCredit ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}">
						{isCredit ? '+' : '-'}${transaction.amount.toFixed(2)}
					</p>
				</div>
			</div>
		</div>

		<!-- Action Selection -->
		<div class="col-span-12 md:col-span-8">
			<div class="space-y-3">
				<!-- Action Type -->
				<MappingActionSelector
					{index}
					selectedAction={mapping.action}
					transactionType={transaction.transactionType}
					onActionChange={handleActionChange}
				/>

				<!-- Map to Existing Bill -->
				{#if mapping.action === 'map_existing'}
					<select
						bind:value={mapping.billId}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
					>
						<option value={undefined}>Select a bill...</option>
						{#each existingBills as existingBill}
							<option value={existingBill.id}>
								{existingBill.name} (${existingBill.amount.toFixed(2)})
							</option>
						{/each}
					</select>
				{/if}

				<!-- Map to Bucket -->
				{#if mapping.action === 'map_to_bucket'}
					<select
						bind:value={mapping.bucketId}
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
					>
						<option value={undefined}>Select a bucket...</option>
						{#each buckets as bucket}
							{@const remaining = bucket.currentCycle
								? bucket.currentCycle.budgetAmount +
									bucket.currentCycle.carryoverAmount -
									bucket.currentCycle.totalSpent
								: bucket.budgetAmount}
							<option value={bucket.id}>
								{bucket.name} (${remaining.toFixed(2)} available)
							</option>
						{/each}
					</select>
				{/if}

				<!-- Create New Bill -->
				{#if mapping.action === 'create_new'}
					<BillMappingForm
						{index}
						bind:billName={mapping.billName}
						bind:dueDate={mapping.dueDate}
						bind:categoryId={mapping.categoryId}
						bind:isRecurring={mapping.isRecurring}
						{categories}
					/>
				{/if}

				<!-- Create New Bucket -->
				{#if mapping.action === 'create_new_bucket'}
					<BucketMappingForm
						{index}
						bind:bucketName={mapping.bucketName}
						bind:budgetAmount={mapping.budgetAmount}
						bind:frequency={mapping.frequency}
						bind:anchorDate={mapping.anchorDate}
					/>
				{/if}

				<!-- Mark as Transfer -->
				{#if mapping.action === 'mark_transfer'}
					<TransferMappingForm
						{index}
						bind:counterpartyAccountId={mapping.counterpartyAccountId}
						bind:transferCategoryId={mapping.transferCategoryId}
						{accounts}
						{categories}
					/>
				{/if}

				<!-- Mark as Refund -->
				{#if mapping.action === 'mark_refund'}
					<RefundMappingForm
						{index}
						bind:refundedBucketId={mapping.refundedBucketId}
						bind:refundedBillId={mapping.refundedBillId}
						refundAmount={transaction.amount}
						{buckets}
						{existingBills}
					/>
				{/if}

				<!-- Mark as Income — no further input needed -->
				{#if mapping.action === 'mark_income'}
					<p class="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
						This transaction will be recorded as income and excluded from spending totals.
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
