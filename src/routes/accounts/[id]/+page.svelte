<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import type { MappingAction } from '$lib/types/import';
	import Button from '$lib/components/Button.svelte';
	import MappingActionSelector from '$lib/components/import/MappingActionSelector.svelte';
	import BillMappingForm from '$lib/components/import/BillMappingForm.svelte';
	import BucketMappingForm from '$lib/components/import/BucketMappingForm.svelte';
	import RefundMappingForm from '$lib/components/import/RefundMappingForm.svelte';
	import TransferMappingForm from '$lib/components/import/TransferMappingForm.svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { formatDateForInput, utcDateToLocal } from '$lib/utils/dates';
	import {
		ArrowLeft,
		ArrowRight,
		ArrowRightLeft,
		Landmark,
		CreditCard,
		PiggyBank,
		Pencil,
		Upload,
		Check,
		Trash2,
		ChevronDown,
		ChevronRight,
		X,
		Search,
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

	let editing = $state(false);
	let searchInput = $state(data.search ?? '');

	/** Build query string preserving current search + filter state */
	function buildParams(overrides: { search?: string; filter?: string; page?: number } = {}) {
		const params = new URLSearchParams();
		const s = overrides.search ?? searchInput.trim();
		const f = overrides.filter ?? data.filter;
		if (s) params.set('search', s);
		if (f) params.set('filter', f);
		if (overrides.page && overrides.page > 1) params.set('page', String(overrides.page));
		return params.toString();
	}

	function submitSearch() {
		goto(`?${buildParams({ search: searchInput.trim() })}`, { keepFocus: true });
	}

	function clearSearch() {
		searchInput = '';
		goto(`?${buildParams({ search: '' })}`, { keepFocus: true });
	}

	function setFilter(value: string) {
		goto(`?${buildParams({ filter: value })}`, { keepFocus: true });
	}

	const filterLabels: Record<string, string> = {
		unclassified: 'unclassified',
		buckets: 'bucket',
		bills: 'bill',
		transfers: 'transfer'
	};

	// Track which transaction row is expanded for re-classification
	let expandedTxnId = $state<number | null>(null);

	// Track saving state per transaction
	let savingTxnId = $state<number | null>(null);

	// Track the mapping state for the currently expanded transaction
	let currentMapping = $state<{
		transactionId: number;
		action: MappingAction;
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
		refundedBucketId?: number;
		refundedBillId?: number;
		counterpartyAccountId?: number;
	} | null>(null);

	// Icon mapping for buckets (same as import page)
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

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatDate(date: Date | string | null): string {
		if (!date) return 'N/A';
		const d = date instanceof Date ? date : new Date(date);
		return utcDateToLocal(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const accountTypeLabel: Record<string, string> = {
		checking: 'Checking',
		savings: 'Savings',
		credit_card: 'Credit Card'
	};

	const accountTypeIcon: Record<string, any> = {
		checking: Landmark,
		savings: PiggyBank,
		credit_card: CreditCard
	};

	/**
	 * Determine the current classification label for a transaction
	 */
	function getClassificationLabel(txn: typeof data.transactions[0]): string {
		if (!txn.isProcessed) return 'Unclassified';
		if (txn.isTransfer) return 'Transfer';
		if (txn.isIncome) return 'Income';
		if (txn.isRefund) return 'Refund';
		if (txn.mappedBillId) return 'Bill';
		if (txn.mappedBucketId) return 'Bucket';
		return 'Processed';
	}

	function getClassificationColor(txn: typeof data.transactions[0]): string {
		if (!txn.isProcessed) return 'text-gray-400';
		if (txn.isTransfer) return 'text-blue-600 dark:text-blue-400';
		if (txn.isIncome) return 'text-green-600 dark:text-green-400';
		if (txn.isRefund) return 'text-amber-600 dark:text-amber-400';
		if (txn.mappedBillId) return 'text-purple-600 dark:text-purple-400';
		if (txn.mappedBucketId) return 'text-indigo-600 dark:text-indigo-400';
		return 'text-green-600 dark:text-green-400';
	}

	// Build an account name lookup map for transfer display
	const accountNameMap = $derived(
		new Map(data.accounts.map((a) => [a.id, a.name]))
	);

	/**
	 * Get a human-readable transfer label showing direction and counterparty account.
	 * DEBIT/XFER = money leaving this account → "To AccountName"
	 * CREDIT = money arriving in this account ← "From AccountName"
	 */
	function getTransferLabel(txn: typeof data.transactions[0]): string {
		if (!txn.counterpartyAccountId) return 'Transfer';
		const counterpartyName = accountNameMap.get(txn.counterpartyAccountId);
		if (!counterpartyName) return 'Transfer';
		const isOutgoing = txn.transactionType === 'DEBIT' || txn.transactionType === 'XFER';
		return isOutgoing ? `To ${counterpartyName}` : `From ${counterpartyName}`;
	}

	/**
	 * Determine the default action for a transaction based on its current state
	 */
	function getDefaultAction(txn: typeof data.transactions[0]): MappingAction {
		if (txn.isTransfer) return 'mark_transfer';
		if (txn.isIncome) return 'mark_income';
		if (txn.isRefund) return 'mark_refund';
		if (txn.mappedBillId) {
			// Was it created as a new bill or mapped to existing?
			return txn.createNewBill ? 'create_new' : 'map_existing';
		}
		if (txn.mappedBucketId) return 'map_to_bucket';
		// Unprocessed: pick smart default based on type
		if (txn.isPotentialTransfer) return 'mark_transfer';
		if (txn.transactionType === 'CREDIT') return 'mark_income';
		return 'skip';
	}

	function toggleTransaction(txn: typeof data.transactions[0]) {
		if (expandedTxnId === txn.id) {
			expandedTxnId = null;
			currentMapping = null;
			return;
		}

		expandedTxnId = txn.id;
		const defaultAction = getDefaultAction(txn);
		currentMapping = {
			transactionId: txn.id,
			action: defaultAction,
			amount: txn.amount,
			billId: txn.mappedBillId ?? undefined,
			bucketId: txn.mappedBucketId ?? undefined,
			refundedBucketId: txn.refundedBucketId ?? undefined,
			refundedBillId: txn.refundedBillId ?? undefined,
			counterpartyAccountId: txn.counterpartyAccountId ?? undefined,
			billName: txn.payee,
			dueDate: formatDateForInput(utcDateToLocal(new Date(txn.datePosted))),
			isRecurring: true,
			recurrenceType: 'monthly',
			bucketName: txn.payee,
			budgetAmount: txn.amount,
			frequency: 'monthly',
			anchorDate: formatDateForInput(utcDateToLocal(new Date(txn.datePosted)))
		};
	}

	function handleActionChange(action: MappingAction) {
		if (!currentMapping) return;
		if (action === 'create_new_bucket') {
			const txn = data.transactions.find(t => t.id === expandedTxnId);
			currentMapping = {
				...currentMapping,
				action,
				bucketName: txn?.payee ?? '',
				budgetAmount: txn?.amount ?? 0,
				frequency: 'monthly',
				anchorDate: txn ? formatDateForInput(utcDateToLocal(new Date(txn.datePosted))) : ''
			};
		} else {
			currentMapping = { ...currentMapping, action };
		}
	}

	// Close expanded row after successful form action
	$effect(() => {
		if (form && 'mappingSuccess' in form && form.mappingSuccess) {
			expandedTxnId = null;
			currentMapping = null;
			savingTxnId = null;
		}
	});
</script>

<svelte:head>
	<title>{data.account.name} - Accounts - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<!-- Back link -->
	<a
		href="/accounts"
		class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 mb-6"
	>
		<ArrowLeft class="h-4 w-4" />
		Back to Accounts
	</a>

	{#if form?.error}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
			<p class="text-sm text-red-800 dark:text-red-200">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
			<p class="text-sm text-green-800 dark:text-green-200">Account updated successfully.</p>
		</div>
	{/if}

	<!-- Account Header -->
	<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
		{#if editing}
			<form
				method="POST"
				action="?/updateAccount"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						editing = false;
					};
				}}
			>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Edit Account</h2>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Account Name
						</label>
						<input
							id="name"
							type="text"
							name="name"
							required
							value={data.account.name}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div>
						<label for="accountType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Account Type
						</label>
						<select
							id="accountType"
							name="accountType"
							value={data.account.accountType ?? 'checking'}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						>
							<option value="checking">Checking</option>
							<option value="savings">Savings</option>
							<option value="credit_card">Credit Card</option>
						</select>
					</div>
					<div>
						<label for="initialBalance" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Current Balance
						</label>
						<input
							id="initialBalance"
							type="number"
							name="initialBalance"
							step="0.01"
							value={data.account.initialBalance}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div>
						<label for="balanceAsOfDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							As of Date
						</label>
						<input
							id="balanceAsOfDate"
							type="date"
							name="balanceAsOfDate"
							value={data.account.balanceAsOfDate ? formatDateForInput(utcDateToLocal(new Date(data.account.balanceAsOfDate))) : formatDateForInput(new Date())}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Only transactions after this date affect the balance
						</p>
					</div>
				</div>
				<div class="mt-4 flex justify-end gap-3">
					<Button variant="secondary" size="sm" onclick={() => (editing = false)}>Cancel</Button>
					<Button type="submit" variant="primary" size="sm">Save Changes</Button>
				</div>
			</form>
		{:else}
			{@const Icon = accountTypeIcon[data.account.accountType ?? 'checking'] ?? Landmark}
			<div class="flex items-start justify-between">
				<div class="flex items-center gap-4">
					<div class="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3">
						<Icon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
					</div>
					<div>
						<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{data.account.name}</h1>
						<p class="text-sm text-gray-500 dark:text-gray-400">
							{accountTypeLabel[data.account.accountType ?? 'checking'] ?? 'Account'}
							{#if data.account.accountNumber}
								&middot; ...{data.account.accountNumber}
							{/if}
							{#if data.account.isExternal}
								&middot; External
							{/if}
						</p>
					</div>
				</div>
				<div class="flex items-center gap-2">
					<Button variant="ghost" size="sm" onclick={() => (editing = true)}>
						<Pencil class="h-4 w-4 mr-1 inline" /> Edit
					</Button>
					<a href="/import">
						<Button variant="secondary" size="sm">
							<Upload class="h-4 w-4 mr-1 inline" /> Import
						</Button>
					</a>
					{#if !data.hasTransactions}
						<form method="POST" action="?/deleteAccount" use:enhance={({ cancel }) => {
							if (!confirm('Are you sure you want to delete this account?')) {
								cancel();
								return;
							}
							return async ({ update }) => {
								await update();
							};
						}}>
							<Button type="submit" variant="danger" size="sm">
								<Trash2 class="h-4 w-4 mr-1 inline" /> Delete
							</Button>
						</form>
					{/if}
				</div>
			</div>

			<!-- Stats -->
			<div class="mt-6 grid gap-4 sm:grid-cols-3">
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<p class="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
					<p class="mt-1 text-2xl font-semibold {data.balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}">
						{formatCurrency(data.balance)}
					</p>
				</div>
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<p class="text-sm text-gray-500 dark:text-gray-400">
						Set Balance
						{#if data.account.balanceAsOfDate}
							<span class="text-gray-400 dark:text-gray-500">
								as of {formatDate(data.account.balanceAsOfDate)}
							</span>
						{/if}
					</p>
					<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
						{formatCurrency(data.account.initialBalance)}
					</p>
				</div>
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
					<p class="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
					<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
						{data.transactionCount}
					</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Transaction History -->
	<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
		<div class="flex items-center justify-between mb-4">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
				Transaction History
			</h2>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				Click a row to reclassify
			</p>
		</div>

		<!-- Search & Filter -->
		<div class="mb-4">
			<div class="flex items-center gap-2">
				<form
					onsubmit={(e) => { e.preventDefault(); submitSearch(); }}
					class="flex items-center gap-2 flex-1"
				>
					<div class="relative flex-1">
						<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
						<input
							type="text"
							bind:value={searchInput}
							placeholder="Search by payee or memo..."
							class="w-full pl-9 pr-8 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						{#if searchInput}
							<button
								type="button"
								onclick={clearSearch}
								class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
							>
								<X class="h-4 w-4" />
							</button>
						{/if}
					</div>
					<Button type="submit" variant="secondary" size="sm">Search</Button>
				</form>
				<select
					value={data.filter ?? ''}
					onchange={(e) => setFilter(e.currentTarget.value)}
					class="whitespace-nowrap px-3 py-2 text-xs font-medium rounded-lg border transition-colors bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
				>
					<option value="">All Transactions</option>
					<option value="unclassified">Unclassified</option>
					<option value="buckets">Buckets</option>
					<option value="bills">Bills</option>
					<option value="transfers">Transfers</option>
				</select>
			</div>
			{#if data.search || data.filter}
				<p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
					{data.transactionCount} result{data.transactionCount !== 1 ? 's' : ''}
					{#if data.search}for "{data.search}"{/if}
					{#if data.filter && filterLabels[data.filter]}
						{data.search ? ',' : ''} showing {filterLabels[data.filter]} only
					{/if}
				</p>
			{/if}
		</div>

		{#if data.transactions.length === 0}
			<p class="text-gray-500 dark:text-gray-400 text-sm">
				{#if data.search && data.filter}
					No {filterLabels[data.filter] ?? ''} transactions matching "{data.search}".
				{:else if data.search}
					No transactions matching "{data.search}".
				{:else if data.filter === 'unclassified'}
					No unclassified transactions. All transactions have been classified.
				{:else if data.filter}
					No {filterLabels[data.filter] ?? ''} transactions found.
				{:else}
					No transactions yet. Import an OFX file to get started.
				{/if}
			</p>
		{:else}
			<div class="space-y-0">
				{#each data.transactions as txn, i}
					<!-- Transaction row -->
					<button
						type="button"
						class="w-full text-left border-b border-gray-100 dark:border-gray-700/50 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer {expandedTxnId === txn.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}"
						onclick={() => toggleTransaction(txn)}
					>
						<div class="grid grid-cols-12 gap-2 py-2.5 px-3 items-center text-sm">
							<div class="col-span-1 flex items-center">
								{#if expandedTxnId === txn.id}
									<ChevronDown class="h-4 w-4 text-gray-400" />
								{:else}
									<ChevronRight class="h-4 w-4 text-gray-400" />
								{/if}
							</div>
							<div class="col-span-2 text-gray-600 dark:text-gray-400 whitespace-nowrap">
								{formatDate(txn.datePosted)}
							</div>
							<div class="col-span-4 text-gray-900 dark:text-gray-100">
								{txn.payee}
								{#if txn.memo}
									<span class="block text-xs text-gray-500 dark:text-gray-400 truncate">{txn.memo}</span>
								{/if}
							</div>
							<div class="col-span-2 text-right font-medium whitespace-nowrap {txn.transactionType === 'CREDIT' ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}">
								{txn.transactionType === 'CREDIT' ? '+' : '-'}{formatCurrency(txn.amount)}
							</div>
							<div class="col-span-3 flex items-center justify-end gap-2">
								{#if txn.isTransfer}
									<span class="inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-400 truncate" title={getTransferLabel(txn)}>
										<ArrowRightLeft class="h-3 w-3 shrink-0" />
										{getTransferLabel(txn)}
									</span>
								{:else}
									<span class="text-xs font-medium {getClassificationColor(txn)}">
										{getClassificationLabel(txn)}
									</span>
								{/if}
								{#if txn.isProcessed}
									<Check class="h-3 w-3 text-green-500 shrink-0" />
								{/if}
							</div>
						</div>
					</button>

					<!-- Expanded mapping form -->
					{#if expandedTxnId === txn.id && currentMapping}
						<div class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-4 py-4">
							<div class="flex items-center justify-between mb-3">
								<h3 class="text-sm font-medium text-gray-700 dark:text-gray-300">
									{txn.isProcessed ? 'Reclassify' : 'Classify'} Transaction
								</h3>
								<button
									type="button"
									class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
									onclick={() => { expandedTxnId = null; currentMapping = null; }}
								>
									<X class="h-4 w-4" />
								</button>
							</div>

							<form
								method="POST"
								action="?/updateTransactionMapping"
								use:enhance={({ cancel }) => {
									if (!currentMapping) { cancel(); return; }
									savingTxnId = txn.id;
									return async ({ update }) => {
										await update();
										savingTxnId = null;
									};
								}}
							>
								<input type="hidden" name="mapping" value={JSON.stringify(currentMapping)} />

								<div class="space-y-3">
									<!-- Action selector -->
									<MappingActionSelector
										index={i}
										selectedAction={currentMapping.action}
										transactionType={txn.transactionType}
										isPotentialTransfer={txn.isPotentialTransfer}
										onActionChange={handleActionChange}
									/>

									<!-- Map to Existing Bill -->
									{#if currentMapping.action === 'map_existing'}
										<select
											bind:value={currentMapping.billId}
											class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
										>
											<option value={undefined}>Select a bill...</option>
											{#each data.existingBills as existingBill}
												<option value={existingBill.id}>
													{existingBill.name} (${existingBill.amount.toFixed(2)})
												</option>
											{/each}
										</select>
									{/if}

									<!-- Map to Bucket -->
									{#if currentMapping.action === 'map_to_bucket'}
										<select
											bind:value={currentMapping.bucketId}
											class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
										>
											<option value={undefined}>Select a bucket...</option>
											{#each data.buckets as bucket}
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
									{#if currentMapping.action === 'create_new'}
										<BillMappingForm
											index={i}
											bind:billName={currentMapping.billName}
											bind:dueDate={currentMapping.dueDate}
											bind:categoryId={currentMapping.categoryId}
											bind:isRecurring={currentMapping.isRecurring}
											bind:recurrenceType={currentMapping.recurrenceType}
											categories={data.categories}
										/>
									{/if}

									<!-- Create New Bucket -->
									{#if currentMapping.action === 'create_new_bucket'}
										<BucketMappingForm
											index={i}
											bind:bucketName={currentMapping.bucketName}
											bind:budgetAmount={currentMapping.budgetAmount}
											bind:frequency={currentMapping.frequency}
											bind:anchorDate={currentMapping.anchorDate}
										/>
									{/if}

									<!-- Mark as Refund -->
									{#if currentMapping.action === 'mark_refund'}
										<RefundMappingForm
											index={i}
											bind:refundedBucketId={currentMapping.refundedBucketId}
											bind:refundedBillId={currentMapping.refundedBillId}
											refundAmount={txn.amount}
											buckets={data.buckets}
											existingBills={data.existingBills}
										/>
									{/if}

									<!-- Mark as Income -->
									{#if currentMapping.action === 'mark_income'}
										<p class="text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded px-2 py-1">
											This transaction will be recorded as income.
										</p>
									{/if}

									<!-- Mark as Transfer -->
									{#if currentMapping.action === 'mark_transfer'}
										<TransferMappingForm
											index={i}
											bind:counterpartyAccountId={currentMapping.counterpartyAccountId}
											accounts={data.accounts}
											currentAccountId={data.account.id}
										/>
									{/if}

									<!-- Skip / Reset -->
									{#if currentMapping.action === 'skip'}
										<p class="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700/50 rounded px-2 py-1">
											{txn.isProcessed
												? 'This will reset the transaction to unclassified.'
												: 'This transaction will remain unclassified.'}
										</p>
									{/if}

									<!-- Save button -->
									<div class="flex justify-end gap-2 pt-2">
										<Button
											variant="secondary"
											size="sm"
											onclick={() => { expandedTxnId = null; currentMapping = null; }}
										>
											Cancel
										</Button>
										<Button
											type="submit"
											variant="primary"
											size="sm"
											disabled={savingTxnId === txn.id}
										>
											{#if savingTxnId === txn.id}
												Saving...
											{:else}
												Save
											{/if}
										</Button>
									</div>
								</div>
							</form>
						</div>
					{/if}
				{/each}
			</div>
			{#if data.transactionCount > data.transactions.length || data.page > 1}
				<div class="mt-4 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
					<p class="text-xs text-gray-500 dark:text-gray-400">
						Showing {(data.page - 1) * data.perPage + 1}–{Math.min(data.page * data.perPage, data.transactionCount)} of {data.transactionCount}
					</p>
					<div class="flex items-center gap-2">
					{#if data.page > 1}
						<a
							href="?{buildParams({ page: data.page - 1 })}"
							class="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
						>
							<ArrowLeft class="h-3 w-3" /> Prev
						</a>
					{/if}
					<span class="text-xs text-gray-500 dark:text-gray-400">
						Page {data.page} of {data.totalPages}
					</span>
					{#if data.page < data.totalPages}
						<a
							href="?{buildParams({ page: data.page + 1 })}"
							class="inline-flex items-center gap-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
						>
							Next <ArrowRight class="h-3 w-3" />
						</a>
					{/if}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Transfers for this account (only shown when not filtering, or filtering by transfers) -->
	{#if data.transfers.length > 0 && (!data.filter || data.filter === 'transfers')}
		<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
				<ArrowRightLeft class="h-5 w-5" />
				Transfers
			</h2>

			<div class="space-y-2">
				{#each data.transfers as transfer}
					<div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
						<div class="flex items-center gap-2 text-sm">
							<span class="text-gray-900 dark:text-gray-100">{transfer.fromAccount.name}</span>
							<ArrowRightLeft class="h-3.5 w-3.5 text-gray-400" />
							<span class="text-gray-900 dark:text-gray-100">{transfer.toAccount.name}</span>
						</div>
						<div class="flex items-center gap-4 text-sm">
							<span class="font-medium text-gray-900 dark:text-gray-100">
								{formatCurrency(transfer.amount)}
							</span>
							<span class="text-xs text-gray-500 dark:text-gray-400">
								{formatDate(transfer.fromTransaction.datePosted)}
							</span>
							<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
								{transfer.status === 'confirmed'
									? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
									: transfer.status === 'pending'
										? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
										: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'}">
								{transfer.status}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Import Sessions -->
	{#if data.importSessions.length > 0}
		<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
				Import History
			</h2>

			<div class="space-y-2">
				{#each data.importSessions as session}
					<div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-sm">
						<div>
							<span class="text-gray-900 dark:text-gray-100">{session.fileName}</span>
							<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
								{formatDate(session.createdAt)}
							</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-gray-600 dark:text-gray-400">
								{session.importedCount} / {session.transactionCount} imported
							</span>
							<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium
								{session.status === 'completed'
									? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
									: session.status === 'pending'
										? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
										: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'}">
								{session.status}
							</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
