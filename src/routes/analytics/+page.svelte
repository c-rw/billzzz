<script lang="ts">
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';
		import { calculateNextPayday, daysUntil } from '$lib/utils/payday';
	import CashFlowChart from '$lib/components/CashFlowChart.svelte';
	import SpendingByBucketChart from '$lib/components/SpendingByBucketChart.svelte';
	import MonthlySpendingChart from '$lib/components/MonthlySpendingChart.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import AlertBanner from '$lib/components/AlertBanner.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import PaydaySettingsForm from '$lib/components/PaydaySettingsForm.svelte';
	import ResponsiveStatGrid from '$lib/components/ResponsiveStatGrid.svelte';
	import { formatCurrency } from '$lib/utils/format';

	let { data }: { data: PageData } = $props();

	// Make analytics reactive
	const analytics = $derived(data.analytics);
	const spending = $derived(data.spendingAnalytics);

	// Check if user needs to configure income for full forecasting
	const needsIncomeSetup = $derived(analytics.metrics.expectedIncome === null || !data.paydaySettings);

	// Group warnings by severity (reactive)
	const highWarnings = $derived(analytics.warnings.filter((w) => w.severity === 'high'));
	const mediumWarnings = $derived(analytics.warnings.filter((w) => w.severity === 'medium'));

	// Collapsible warning sections
	let highWarningsOpen = $state(true);
	let mediumWarningsOpen = $state(true);

	// Income form state
	let showIncomeForm = $state(false);
	let incomeValue = $state('');
	let isSubmittingIncome = $state(false);

	// Payday modal state
	let showPaydaySettingsModal = $state(false);

	// Tab state
	let activeTab = $state<'cashflow' | 'spending'>('cashflow');

	// Payday computed values
	function ordinal(n: number): string {
		const s = ['th', 'st', 'nd', 'rd'];
		const v = n % 100;
		return n + (s[(v - 20) % 10] || s[v] || s[0]);
	}

	const nextPayday = $derived(
		data.paydaySettings
			? (() => {
					try {
						return calculateNextPayday(data.paydaySettings);
					} catch {
						return null;
					}
				})()
			: null
	);

	const daysAway = $derived(nextPayday ? daysUntil(nextPayday) : null);

	const nextPaydayLabel = $derived(
		nextPayday && daysAway !== null
			? {
					date: nextPayday.toLocaleDateString(undefined, {
						weekday: 'long',
						month: 'long',
						day: 'numeric'
					}),
					note: daysAway === 0 ? 'Today!' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`
				}
			: null
	);

	async function handleSavePaydaySettings(settingsData: any) {
		try {
			const checkResponse = await fetch('/api/payday-settings');
			const currentSettings = checkResponse.ok ? await checkResponse.json() : null;
			const method = currentSettings ? 'PUT' : 'POST';

			const response = await fetch('/api/payday-settings', {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(settingsData)
			});

			if (response.ok) {
				showPaydaySettingsModal = false;
				await invalidateAll();
			} else {
				const body = await response.json().catch(() => ({}));
				const msg = body?.error || `Server error ${response.status}`;
				alert(`Failed to save payday settings: ${msg}`);
			}
		} catch (error) {
			console.error('Error saving payday settings:', error);
			alert(`Failed to save payday settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	async function handleDeletePaydaySettings() {
		if (!confirm('Are you sure you want to remove your payday schedule?')) {
			return;
		}

		try {
			const response = await fetch('/api/payday-settings', {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			} else {
				alert('Failed to delete payday settings. Please try again.');
			}
		} catch (error) {
			console.error('Error deleting payday settings:', error);
			alert('Failed to delete payday settings. Please try again.');
		}
	}
</script>

<svelte:head>
	<title>Analytics & Forecast - Billzzz</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Financial Analytics</h1>
		<p class="mt-2 text-gray-600 dark:text-gray-400">
			Cash flow forecast and spending insights
		</p>
	</div>

	<!-- Setup prompt if income not configured -->
	{#if needsIncomeSetup}
		<div class="mb-8 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-6">
			<div class="flex items-start gap-3">
				<svg class="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<div>
					<h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Setup Required</h3>
					<p class="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
						To enable cash flow forecasting, please configure your expected income per paycheck
						and payday schedule below. Account balances are computed automatically from your
						imported transactions.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Income & Payday Settings -->
	<div class="mb-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
		<div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
			<div>
				<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Income & Payday</h2>
				<p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
					Your paycheck amount and pay schedule for forecasting
				</p>
			</div>
		</div>

		<div class="p-6">
			<div class="grid gap-6 sm:grid-cols-2">
				<!-- Expected Income -->
				<div>
					{#if showIncomeForm || analytics.metrics.expectedIncome === null}
						<form
							method="POST"
							action="?/updatePreferences"
							use:enhance={() => {
								isSubmittingIncome = true;
								return async ({ update }) => {
									await update();
									isSubmittingIncome = false;
									showIncomeForm = false;
									await invalidateAll();
								};
							}}
						>
							<label
								for="expectedIncome"
								class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
							>
								Expected Income Per Paycheck
							</label>
							<div class="relative max-w-xs">
								<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
								<input
									type="number"
									id="expectedIncome"
									name="expectedIncomeAmount"
									bind:value={incomeValue}
									step="0.01"
									placeholder="0.00"
									class="pl-7 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
									required
								/>
							</div>
							<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
								Typical take-home pay per paycheck
							</p>
							<div class="mt-3 flex gap-2">
								<Button type="submit" variant="primary" size="sm" disabled={isSubmittingIncome}>
									{isSubmittingIncome ? 'Saving...' : 'Save'}
								</Button>
								{#if analytics.metrics.expectedIncome !== null}
									<Button type="button" variant="ghost" size="sm" onclick={() => (showIncomeForm = false)}>
										Cancel
									</Button>
								{/if}
							</div>
						</form>
					{:else}
						<div class="flex items-start justify-between">
							<div>
								<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Expected Income Per Paycheck</p>
								<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
									${analytics.metrics.expectedIncome?.toFixed(2) ?? '0.00'}
								</p>
							</div>
							<Button variant="ghost" size="sm" onclick={() => { showIncomeForm = true; incomeValue = analytics.metrics.expectedIncome?.toString() ?? ''; }}>
								Edit
							</Button>
						</div>
					{/if}
				</div>

				<!-- Payday Schedule -->
				<div>
					{#if data.paydaySettings}
						<div class="flex items-start justify-between">
							<div class="space-y-2">
								<div>
									<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Pay Schedule</p>
									<p class="mt-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
										{#if data.paydaySettings.frequency === 'weekly'}
											Every week
										{:else if data.paydaySettings.frequency === 'biweekly'}
											Every other week
										{:else if data.paydaySettings.frequency === 'semi-monthly'}
											{ordinal(data.paydaySettings.dayOfMonth ?? 1)} and {ordinal(data.paydaySettings.dayOfMonth2 ?? 15)} of each month
										{:else if data.paydaySettings.frequency === 'monthly'}
											{ordinal(data.paydaySettings.dayOfMonth ?? 1)} of each month
										{/if}
									</p>
								</div>
								{#if nextPaydayLabel}
									<div>
										<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Next Payday</p>
										<p class="mt-0.5 text-base font-semibold text-green-700 dark:text-green-400">
											{nextPaydayLabel.date}
											<span class="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
												{nextPaydayLabel.note}
											</span>
										</p>
									</div>
								{/if}
							</div>
							<div class="flex gap-1">
								<Button variant="ghost" size="sm" onclick={() => (showPaydaySettingsModal = true)}>
									Edit
								</Button>
								<Button variant="ghost" size="sm" onclick={handleDeletePaydaySettings}>
									Remove
								</Button>
							</div>
						</div>
					{:else}
						<div class="flex flex-col items-start gap-2">
							<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Pay Schedule</p>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								No payday schedule configured yet.
							</p>
							<Button variant="primary" size="sm" onclick={() => (showPaydaySettingsModal = true)}>
								Set Schedule
							</Button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Tab bar -->
	<div class="mb-8 border-b border-gray-200 dark:border-gray-700">
		<nav class="-mb-px flex gap-6" aria-label="Analytics tabs">
			<button
				onclick={() => (activeTab = 'cashflow')}
				class="whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors {activeTab === 'cashflow'
					? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
			>
				Cash Flow Forecast
			</button>
			<button
				onclick={() => (activeTab = 'spending')}
				class="whitespace-nowrap border-b-2 pb-3 text-sm font-medium transition-colors {activeTab === 'spending'
					? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
					: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'}"
			>
				Spending History
			</button>
		</nav>
	</div>

	<!-- ── Cash Flow Tab ── -->
	{#if activeTab === 'cashflow'}
	{#if highWarnings.length > 0}
		<div class="mb-8">
			<button
				onclick={() => (highWarningsOpen = !highWarningsOpen)}
				class="flex w-full items-center justify-between mb-4 text-left"
			>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Critical Alerts <span class="ml-2 text-sm font-normal text-red-600 dark:text-red-400">({highWarnings.length})</span>
				</h2>
				<svg class="h-5 w-5 text-gray-500 transition-transform {highWarningsOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if highWarningsOpen}
				<div class="space-y-3">
					{#each highWarnings as warning}
						<AlertBanner
							type={warning.type}
							severity={warning.severity}
							date={warning.date}
							message={warning.message}
							amount={warning.amount}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	<!-- Key Metrics Dashboard -->
	<div class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics</h2>

		<ResponsiveStatGrid cols={2} lgCols={3}>
			<MetricCard
				title="Total Balance"
				value={`$${analytics.metrics.currentBalance.toFixed(2)}`}
				subtitle="Sum of all accounts"
				variant={analytics.metrics.currentBalance > 0 ? 'default' : 'danger'}
			/>
			<MetricCard
				title="Savings Per Paycheck"
				value={`$${analytics.metrics.savingsPerPaycheck.toFixed(2)}`}
				subtitle="After all obligations"
				variant={analytics.metrics.savingsPerPaycheck > 0 ? 'success' : 'danger'}
				highlight={true}
			/>
			<MetricCard
				title="Daily Burn Rate"
				value={`$${analytics.metrics.burnRate.toFixed(2)}`}
				subtitle="Average spending per day"
				variant="default"
			/>
			<MetricCard
				title="Runway"
				value={`${Math.floor(analytics.metrics.runway)} days`}
				subtitle="Until balance reaches $0"
				variant={analytics.metrics.runway > 30 ? 'success' : analytics.metrics.runway > 14 ? 'warning' : 'danger'}
			/>
			<MetricCard
				title="Monthly Obligations"
				value={`$${analytics.metrics.totalMonthlyObligations.toFixed(2)}`}
				subtitle="Bills + Buckets + Debts"
				variant="default"
			/>
			{#if analytics.metrics.nextPayday}
				<MetricCard
					title="Next Payday"
					value={format(analytics.metrics.nextPayday, 'MMM d')}
					subtitle={format(analytics.metrics.nextPayday, 'yyyy')}
					variant="default"
				/>
			{/if}
		</ResponsiveStatGrid>
	</div>

	<!-- Cash Flow Projection Chart -->
	{#if !needsIncomeSetup}
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
				90-Day Cash Flow Forecast
			</h2>
			<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
				<CashFlowChart data={analytics.cashFlowProjection} />
			</div>
		</div>
	{/if}

	<!-- Spending Breakdown -->
	<div class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
			Monthly Spending Breakdown
		</h2>
		<div class="grid gap-4 md:grid-cols-2">
			<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Fixed Bills</p>
						<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
							${analytics.spendingBreakdown.bills.toFixed(0)}
						</p>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{((analytics.spendingBreakdown.bills / analytics.metrics.totalMonthlyObligations) * 100).toFixed(0)}% of total
						</p>
					</div>
					<div class="rounded-full bg-blue-100 dark:bg-blue-900 p-3">
						<svg class="h-8 w-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
						</svg>
					</div>
				</div>
			</div>

			<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Variable Buckets</p>
						<p class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
							${analytics.spendingBreakdown.buckets.toFixed(0)}
						</p>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							{((analytics.spendingBreakdown.buckets / analytics.metrics.totalMonthlyObligations) * 100).toFixed(0)}% of total
						</p>
					</div>
					<div class="rounded-full bg-green-100 dark:bg-green-900 p-3">
						<svg class="h-8 w-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
						</svg>
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Medium Priority Warnings -->
	{#if mediumWarnings.length > 0}
		<div class="mb-8">
			<button
				onclick={() => (mediumWarningsOpen = !mediumWarningsOpen)}
				class="flex w-full items-center justify-between mb-4 text-left"
			>
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
					Additional Warnings <span class="ml-2 text-sm font-normal text-yellow-600 dark:text-yellow-400">({mediumWarnings.length})</span>
				</h2>
				<svg class="h-5 w-5 text-gray-500 transition-transform {mediumWarningsOpen ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{#if mediumWarningsOpen}
				<div class="space-y-2">
					{#each mediumWarnings.slice(0, 5) as warning}
						<AlertBanner
							type={warning.type}
							severity={warning.severity}
							date={warning.date}
							message={warning.message}
							amount={warning.amount}
						/>
					{/each}
				</div>
			{/if}
		</div>
	{/if}

	{/if}

	<!-- ── Spending History Tab ── -->
	{#if activeTab === 'spending'}
		{#if spending.transactionCount === 0}
			<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-10 text-center shadow-sm">
				<p class="text-gray-500 dark:text-gray-400">No imported transactions found in the last 90 days.</p>
				<p class="mt-1 text-sm text-gray-400 dark:text-gray-500">Import bank transactions from an account to see spending analytics.</p>
			</div>
		{:else}
			<!-- Summary stats -->
			<div class="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Spent (90 days)</p>
					<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{formatCurrency(spending.totalSpent)}</p>
				</div>
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Transactions</p>
					<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{spending.transactionCount}</p>
				</div>
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Avg / Month</p>
					<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
						{formatCurrency(spending.byMonth.length > 0 ? spending.totalSpent / spending.byMonth.length : 0)}
					</p>
				</div>
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
					<p class="text-sm font-medium text-gray-500 dark:text-gray-400">Uncategorized</p>
					<p class="mt-1 text-2xl font-bold {spending.uncategorizedSpent > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-900 dark:text-gray-100'}">
						{formatCurrency(spending.uncategorizedSpent)}
					</p>
				</div>
			</div>

			<div class="mb-6 grid gap-6 lg:grid-cols-2">
				<!-- Spending by Bucket -->
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Spending by Category</h2>
					<SpendingByBucketChart data={spending.byBucket} />
				</div>

				<!-- Monthly Spending -->
				<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
					<h2 class="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">Monthly Spending</h2>
					<MonthlySpendingChart data={spending.byMonth} />
				</div>
			</div>

			<!-- Top Payees -->
			<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
				<div class="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
					<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Top Payees</h2>
					<p class="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Highest-spend merchants in the last 90 days</p>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full text-sm">
						<thead>
							<tr class="border-b border-gray-100 dark:border-gray-700 text-left">
								<th class="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">#</th>
								<th class="px-6 py-3 font-medium text-gray-500 dark:text-gray-400">Payee</th>
								<th class="px-6 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Transactions</th>
								<th class="px-6 py-3 text-right font-medium text-gray-500 dark:text-gray-400">Total Spent</th>
							</tr>
						</thead>
						<tbody>
							{#each spending.topPayees as payee, i}
								<tr class="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30">
									<td class="px-6 py-3 text-gray-400 dark:text-gray-500">{i + 1}</td>
									<td class="px-6 py-3 font-medium text-gray-900 dark:text-gray-100">{payee.payee}</td>
									<td class="px-6 py-3 text-right text-gray-600 dark:text-gray-400">{payee.count}</td>
									<td class="px-6 py-3 text-right font-semibold text-gray-900 dark:text-gray-100">{formatCurrency(payee.totalSpent)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
{#if showPaydaySettingsModal}
	<Modal
		bind:isOpen={showPaydaySettingsModal}
		onClose={() => (showPaydaySettingsModal = false)}
		title={data.paydaySettings ? 'Edit Payday Schedule' : 'Set Payday Schedule'}
	>
		<PaydaySettingsForm
			initialData={data.paydaySettings}
			onSubmit={handleSavePaydaySettings}
			onCancel={() => (showPaydaySettingsModal = false)}
		/>
	</Modal>
{/if}
