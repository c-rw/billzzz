<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import AccountHeader from '$lib/components/account/AccountHeader.svelte';
	import AccountTransactionList from '$lib/components/account/AccountTransactionList.svelte';
	import FormBanner from '$lib/components/FormBanner.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { ArrowLeft, ArrowRightLeft } from 'lucide-svelte';
	import { formatDate } from '$lib/utils/dates';
	import { formatCurrency } from '$lib/utils/format';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	const mappingSuccess = $derived(form && 'mappingSuccess' in form ? (form.mappingSuccess ?? false) : false);
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
		<FormBanner type="error" message={form.error} />
	{/if}

	{#if form?.success}
		<FormBanner type="success" message="Account updated successfully." />
	{/if}

	<AccountHeader
		account={data.account}
		balance={data.balance}
		transactionCount={data.transactionCount}
		hasTransactions={data.hasTransactions}
	/>

	<AccountTransactionList {data} {mappingSuccess} />

	<!-- Transfers for this account (only shown when not filtering, or filtering by transfers) -->
	{#if data.transfers.length > 0 && (!data.filter || data.filter === 'transfers')}
		<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
				<ArrowRightLeft class="h-5 w-5" />
				Transfers
			</h2>

			<div class="space-y-2">
				{#each data.transfers as transfer}
					<div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
						<div class="flex items-center gap-2 text-sm min-w-0">
							<span class="text-gray-900 dark:text-gray-100">{transfer.fromAccount.name}</span>
							<ArrowRightLeft class="h-3.5 w-3.5 text-gray-400 shrink-0" />
							<span class="text-gray-900 dark:text-gray-100">{transfer.toAccount.name}</span>
						</div>
						<div class="flex items-center flex-wrap gap-3 text-sm">
							<span class="font-medium text-gray-900 dark:text-gray-100">
								{formatCurrency(transfer.amount)}
							</span>
							<span class="text-xs text-gray-500 dark:text-gray-400">
								{formatDate(transfer.fromTransaction.datePosted, 'N/A')}
							</span>
							<StatusBadge status={transfer.status} />
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
					<div class="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-sm">
						<div>
							<span class="text-gray-900 dark:text-gray-100">{session.fileName}</span>
							<span class="text-xs text-gray-500 dark:text-gray-400 ml-2">
								{formatDate(session.createdAt, 'N/A')}
							</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="text-gray-600 dark:text-gray-400">
								{session.importedCount} / {session.transactionCount} imported
							</span>
							<StatusBadge status={session.status} />
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
