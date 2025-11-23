<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import OFXUploadForm from '$lib/components/import/OFXUploadForm.svelte';
	import TransactionCard from '$lib/components/import/TransactionCard.svelte';
	import { enhance } from '$app/forms';
	import {
		ShoppingCart,
		Fuel,
		Utensils,
		Coffee,
		Popcorn,
		Dumbbell,
		Gamepad2,
		Smartphone,
		Shirt,
		Home,
		Dog,
		Heart
	} from 'lucide-svelte';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let uploading = $state(false);
	let processing = $state(false);
	let selectedFile = $state<File | null>(null);

	// Icon mapping for buckets
	const iconMap: Record<string, any> = {
		'shopping-cart': ShoppingCart,
		fuel: Fuel,
		utensils: Utensils,
		coffee: Coffee,
		popcorn: Popcorn,
		dumbbell: Dumbbell,
		gamepad: Gamepad2,
		smartphone: Smartphone,
		shirt: Shirt,
		home: Home,
		dog: Dog,
		heart: Heart
	};

	// Transaction mapping state
	let transactionMappings = $state<
		Array<{
			transactionId: number;
			action: 'map_existing' | 'create_new' | 'map_to_bucket' | 'create_new_bucket' | 'skip';
			billId?: number;
			billName?: string;
			amount: number;
			dueDate?: string;
			categoryId?: number;
			isRecurring?: boolean;
			recurrenceType?: string;
			bucketId?: number;
			bucketName?: string;
			budgetAmount?: number;
			frequency?: string;
			anchorDate?: string;
		}>
	>([]);

	// Initialize mappings when transactions load
	$effect(() => {
		if (data.transactions.length > 0 && transactionMappings.length === 0) {
			transactionMappings = data.transactions.map((t) => ({
				transactionId: t.transaction.id,
				action: 'skip' as const,
				amount: t.transaction.amount,
				billName: t.transaction.payee,
				dueDate: new Date(t.transaction.datePosted).toISOString().split('T')[0]
			}));
		}
	});

	function selectAllUnmapped() {
		transactionMappings = transactionMappings.map((mapping) => {
			if (mapping.action === 'skip') {
				return { ...mapping, action: 'create_new' };
			}
			return mapping;
		});
	}

	function deselectAll() {
		transactionMappings = transactionMappings.map((mapping) => ({
			...mapping,
			action: 'skip'
		}));
	}
</script>

<svelte:head>
	<title>Import Transactions - Billzzz</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
	<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Import Transactions</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Upload OFX or QFX files from your bank to import transactions
			</p>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
				<p class="text-sm text-red-800 dark:text-red-200">{form.error}</p>
			</div>
		{/if}

		{#if !data.sessionId}
			<!-- Upload Form -->
			<OFXUploadForm bind:uploading bind:selectedFile />
		{:else}
			<!-- Review Transactions -->
			<div class="space-y-6">
				<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								Review Transactions ({data.transactions.length})
							</h2>
							<p class="text-sm text-gray-600 dark:text-gray-400">
								Map transactions to bills or create new bills
							</p>
							{#if data.session?.skippedCount && data.session.skippedCount > 0}
								<p class="text-sm text-amber-600 dark:text-amber-400 mt-1">
									{data.session.skippedCount} duplicate transaction{data.session.skippedCount >
									1
										? 's'
										: ''} skipped (already imported)
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<Button variant="secondary" size="sm" onclick={selectAllUnmapped}>
								Select All Unmapped
							</Button>
							<Button variant="secondary" size="sm" onclick={deselectAll}> Deselect All </Button>
						</div>
					</div>

					<form
						method="POST"
						action="?/processTransactions"
						use:enhance={() => {
							processing = true;
							return async ({ update }) => {
								processing = false;
								await update();
							};
						}}
					>
						<input type="hidden" name="sessionId" value={data.sessionId} />
						<input type="hidden" name="mappings" value={JSON.stringify(transactionMappings)} />

						<div class="space-y-4">
							{#each data.transactions as { transaction }, index}
								<TransactionCard
									{transaction}
									{index}
									bind:mapping={transactionMappings[index]}
									existingBills={data.existingBills}
									buckets={data.buckets}
									categories={data.categories}
									{iconMap}
								/>
							{/each}
						</div>

						<div class="mt-6 flex justify-end gap-3">
							<a
								href="/import"
								class="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
							>
								Cancel
							</a>
							<Button type="submit" variant="primary" size="md" disabled={processing}>
								{#if processing}
									Processing...
								{:else}
									Import {transactionMappings.filter((m) => m.action !== 'skip').length} Transactions
								{/if}
							</Button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
