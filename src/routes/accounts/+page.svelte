<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';
	import {
		Landmark,
		CreditCard,
		PiggyBank,
		ArrowRightLeft,
		Check,
		X,
		Plus,
		ExternalLink,
		Trash2
	} from 'lucide-svelte';
	import { formatDateForInput, utcDateToLocal } from '$lib/utils/dates';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let showNewAccountForm = $state(false);

	const accountTypeIcon: Record<string, any> = {
		checking: Landmark,
		savings: PiggyBank,
		credit_card: CreditCard
	};

	function formatCurrency(amount: number): string {
		return new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'USD'
		}).format(amount);
	}

	function formatDate(date: Date | string | null): string {
		if (!date) return 'Never';
		const d = date instanceof Date ? date : new Date(date);
		return utcDateToLocal(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Accounts - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Accounts</h1>
				<p class="mt-2 text-gray-600 dark:text-gray-400">
					Manage your bank accounts and track transfers between them
				</p>
			</div>
			<Button variant="primary" size="md" onclick={() => (showNewAccountForm = !showNewAccountForm)}>
				<Plus class="mr-2 h-4 w-4 inline" />
				Add Account
			</Button>
		</div>
	</div>

	{#if form?.error}
		<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
			<p class="text-sm text-red-800 dark:text-red-200">{form.error}</p>
		</div>
	{/if}

	{#if form?.success}
		<div class="mb-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
			<p class="text-sm text-green-800 dark:text-green-200">Operation completed successfully.</p>
		</div>
	{/if}

	<!-- New Account Form (inline, toggleable) -->
	{#if showNewAccountForm}
		<div class="mb-8 rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
			<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">New Account</h2>
			<form
				method="POST"
				action="?/createAccount"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
						showNewAccountForm = false;
					};
				}}
			>
				<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Account Name
						</label>
						<input
							id="name"
							type="text"
							name="name"
							required
							placeholder="e.g. Savings Account"
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div>
						<label for="accountType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Type
						</label>
						<select
							id="accountType"
							name="accountType"
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
							value="0"
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
							value={formatDateForInput(new Date())}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
					</div>
					<div>
						<span class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							Options
						</span>
						<label class="flex items-center gap-2 mt-2">
							<input type="checkbox" name="isExternal" class="rounded border-gray-300 dark:border-gray-600" />
							<span class="text-sm text-gray-700 dark:text-gray-300">External account</span>
						</label>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							External accounts are ones you don't import from but may transfer to.
						</p>
					</div>
				</div>
				<div class="mt-4 flex justify-end gap-3">
					<Button variant="secondary" size="sm" onclick={() => (showNewAccountForm = false)}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" size="sm">
						Create Account
					</Button>
				</div>
			</form>
		</div>
	{/if}

	<!-- Account Cards -->
	{#if data.accounts.length === 0}
		<div class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-12 text-center">
			<Landmark class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
			<h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No accounts yet</h3>
			<p class="mt-2 text-gray-500 dark:text-gray-400">
				Create an account, then import transactions from its detail page.
			</p>
			<div class="mt-6 flex justify-center gap-3">
				<Button variant="primary" size="md" onclick={() => (showNewAccountForm = true)}>
					Add Account
				</Button>
			</div>
		</div>
	{:else}
		<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.accounts as account}
				{@const Icon = accountTypeIcon[account.accountType ?? 'checking'] ?? Landmark}
				<a
					href="/accounts/{account.id}"
					class="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
				>
					<div class="flex items-start justify-between">
						<div class="flex items-center gap-3">
							<div class="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-2">
								<Icon class="h-5 w-5 text-blue-600 dark:text-blue-400" />
							</div>
							<div>
								<h3 class="font-semibold text-gray-900 dark:text-gray-100">{account.name}</h3>
								<p class="text-xs text-gray-500 dark:text-gray-400">
									{account.accountType ? account.accountType.replace('_', ' ') : 'Account'}
									{#if account.isExternal}
										<span class="ml-1 inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400">
											<ExternalLink class="h-3 w-3" /> external
										</span>
									{/if}
								</p>
							</div>
						</div>
					</div>

					<div class="mt-4">
						<p class="text-2xl font-semibold {account.balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}">
							{formatCurrency(account.balance)}
						</p>
						<p class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Last import: {formatDate(account.lastImportDate)}
						</p>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Transfers Section -->
	{#if data.pendingTransfers.length > 0 || data.recentTransfers.length > 0}
		<div class="space-y-6">
			<h2 class="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
				<ArrowRightLeft class="h-5 w-5" />
				Transfers
			</h2>

			<!-- Pending Transfers -->
			{#if data.pendingTransfers.length > 0}
				<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Pending ({data.pendingTransfers.length})
						{#if data.reviewTransfers}
							<span class="ml-2 text-sm font-normal text-amber-600 dark:text-amber-400">
								New potential transfers detected from your import
							</span>
						{/if}
					</h3>

					<div class="space-y-3">
						{#each data.pendingTransfers as transfer}
							<div class="flex items-center justify-between border border-gray-100 dark:border-gray-700 rounded-lg p-3">
								<div class="flex-1">
									<div class="flex items-center gap-2 text-sm">
										<span class="font-medium text-gray-900 dark:text-gray-100">
											{transfer.fromAccount.name}
										</span>
										<ArrowRightLeft class="h-4 w-4 text-gray-400" />
										<span class="font-medium text-gray-900 dark:text-gray-100">
											{transfer.toAccount.name}
										</span>
										<span class="font-semibold text-gray-900 dark:text-gray-100">
											{formatCurrency(transfer.amount)}
										</span>
									</div>
									<p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
										{formatDate(transfer.fromTransaction.datePosted)}
										{#if transfer.toTransaction}
											&ndash; {formatDate(transfer.toTransaction.datePosted)}
										{/if}
										&middot; {transfer.fromTransaction.payee}
									</p>
								</div>
								<div class="flex gap-2 ml-4">
									<form method="POST" action="?/confirmTransfer" use:enhance>
										<input type="hidden" name="transferId" value={transfer.id} />
										<Button type="submit" variant="primary" size="sm">
											<Check class="h-4 w-4 mr-1 inline" />
											Confirm
										</Button>
									</form>
									<form method="POST" action="?/rejectTransfer" use:enhance>
										<input type="hidden" name="transferId" value={transfer.id} />
										<Button type="submit" variant="secondary" size="sm">
											<X class="h-4 w-4 mr-1 inline" />
											Reject
										</Button>
									</form>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Recent Confirmed Transfers -->
			{#if data.recentTransfers.length > 0}
				<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 p-6">
					<h3 class="font-semibold text-gray-900 dark:text-gray-100 mb-4">
						Recent Transfers
					</h3>

					<div class="space-y-2">
						{#each data.recentTransfers as transfer}
							<div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
								<div class="flex items-center gap-2 text-sm">
									<span class="text-gray-900 dark:text-gray-100">
										{transfer.fromAccount.name}
									</span>
									<ArrowRightLeft class="h-3.5 w-3.5 text-gray-400" />
									<span class="text-gray-900 dark:text-gray-100">
										{transfer.toAccount.name}
									</span>
								</div>
								<div class="flex items-center gap-4 text-sm">
									<span class="font-medium text-gray-900 dark:text-gray-100">
										{formatCurrency(transfer.amount)}
									</span>
									<span class="text-xs text-gray-500 dark:text-gray-400">
										{formatDate(transfer.fromTransaction.datePosted)}
									</span>
									<span class="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400">
										<Check class="h-3 w-3 mr-0.5" />
										Confirmed
									</span>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
