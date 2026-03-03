<script lang="ts">
	import type { PageData } from '../../../routes/accounts/[id]/$types';
	import Button from '$lib/components/Button.svelte';
	import StatCard from '$lib/components/StatCard.svelte';
	import ImportModal from '$lib/components/import/ImportModal.svelte';
	import { enhance } from '$app/forms';
	import { formatDateForInput, formatDate } from '$lib/utils/dates';
	import { formatCurrency } from '$lib/utils/format';
	import { accountTypeIcon } from '$lib/utils/icons';
	import { Landmark, Pencil, Upload, Trash2 } from 'lucide-svelte';

	let {
		account,
		balance,
		transactionCount,
		hasTransactions
	}: {
		account: PageData['account'];
		balance: number;
		transactionCount: number;
		hasTransactions: boolean;
	} = $props();

	let editing = $state(false);
	let showImportModal = $state(false);

	const accountTypeLabel: Record<string, string> = {
		checking: 'Checking',
		savings: 'Savings',
		credit_card: 'Credit Card'
	};
</script>

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
						value={account.name}
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
						value={account.accountType ?? 'checking'}
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
						value={account.initialBalance}
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
						value={account.balanceAsOfDate ? formatDateForInput(account.balanceAsOfDate) : formatDateForInput(new Date())}
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
		{@const Icon = accountTypeIcon[account.accountType ?? 'checking'] ?? Landmark}
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-4">
				<div class="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-3">
					<Icon class="h-6 w-6 text-blue-600 dark:text-blue-400" />
				</div>
				<div>
					<h1 class="text-2xl font-bold text-gray-900 dark:text-gray-100">{account.name}</h1>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{accountTypeLabel[account.accountType ?? 'checking'] ?? 'Account'}
						{#if account.accountNumber}
							&middot; ...{account.accountNumber}
						{/if}
						{#if account.isExternal}
							&middot; External
						{/if}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="ghost" size="sm" onclick={() => (editing = true)}>
					<Pencil class="h-4 w-4 mr-1 inline" /> Edit
				</Button>
				<Button variant="secondary" size="sm" onclick={() => (showImportModal = true)}>
					<Upload class="h-4 w-4 mr-1 inline" /> Import
				</Button>
				{#if !hasTransactions}
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

		<ImportModal
			bind:isOpen={showImportModal}
			onClose={() => (showImportModal = false)}
			accountName={account.name}
		/>

		<!-- Stats -->
		<div class="mt-6 grid gap-4 sm:grid-cols-3">
			<StatCard
				label="Current Balance"
				value={formatCurrency(balance)}
				valueClass={balance >= 0 ? 'text-gray-900 dark:text-gray-100' : 'text-red-600 dark:text-red-400'}
			/>
			<div class="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
				<p class="text-sm text-gray-500 dark:text-gray-400">
					Set Balance
					{#if account.balanceAsOfDate}
						<span class="text-gray-400 dark:text-gray-500">
							as of {formatDate(account.balanceAsOfDate)}
						</span>
					{/if}
				</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">
					{formatCurrency(account.initialBalance)}
				</p>
			</div>
			<StatCard label="Transactions" value={String(transactionCount)} />
		</div>
	{/if}
</div>
