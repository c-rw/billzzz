<script lang="ts">
	import type { PageData } from './$types';
	import { invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';
	import CashFlowChart from '$lib/components/CashFlowChart.svelte';
	import MetricCard from '$lib/components/MetricCard.svelte';
	import BalanceInputForm from '$lib/components/BalanceInputForm.svelte';
	import AlertBanner from '$lib/components/AlertBanner.svelte';

	let { data }: { data: PageData } = $props();

	// Make analytics reactive
	const analytics = $derived(data.analytics);

	// Check if user needs to configure preferences (reactive)
	const needsSetup = $derived(analytics.metrics.currentBalance === null || analytics.metrics.expectedIncome === null);

	// Group warnings by severity (reactive)
	const highWarnings = $derived(analytics.warnings.filter((w) => w.severity === 'high'));
	const mediumWarnings = $derived(analytics.warnings.filter((w) => w.severity === 'medium'));

	async function handlePreferencesUpdate() {
		await invalidateAll();
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

	<!-- Setup prompt if needed -->
	{#if needsSetup}
		<div class="mb-8 rounded-lg border-2 border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950 p-6">
			<div class="flex items-start gap-3">
				<svg class="h-6 w-6 text-yellow-600 dark:text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
				</svg>
				<div>
					<h3 class="text-lg font-semibold text-yellow-900 dark:text-yellow-100">Setup Required</h3>
					<p class="mt-1 text-sm text-yellow-800 dark:text-yellow-200">
						To enable cash flow forecasting, please enter your current balance and expected income below.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Balance & Income Input -->
	<div class="mb-8">
		<BalanceInputForm
			currentBalance={analytics.metrics.currentBalance}
			expectedIncome={analytics.metrics.expectedIncome}
			on:updated={handlePreferencesUpdate}
		/>
	</div>

	<!-- Warnings / Alerts -->
	{#if highWarnings.length > 0}
		<div class="mb-8">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Critical Alerts</h2>
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
		</div>
	{/if}

	<!-- Key Metrics Dashboard -->
	<div class="mb-8">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Key Metrics</h2>

		<!-- Mobile: Horizontal scroll -->
		<div class="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar md:hidden">
			<div class="min-w-[280px] snap-center shrink-0">
				<MetricCard
					title="Current Balance"
					value={analytics.metrics.currentBalance !== null
						? `$${analytics.metrics.currentBalance.toFixed(2)}`
						: 'Not set'}
					subtitle={analytics.metrics.currentBalance !== null ? 'Updated today' : 'Click above to set'}
					variant={analytics.metrics.currentBalance !== null && analytics.metrics.currentBalance > 0 ? 'default' : 'danger'}
				/>
			</div>
			<div class="min-w-[280px] snap-center shrink-0">
				<MetricCard
					title="Savings Per Paycheck"
					value={`$${analytics.metrics.savingsPerPaycheck.toFixed(2)}`}
					subtitle="After all obligations"
					variant={analytics.metrics.savingsPerPaycheck > 0 ? 'success' : 'danger'}
					highlight={true}
				/>
			</div>
			<div class="min-w-[280px] snap-center shrink-0">
				<MetricCard
					title="Daily Burn Rate"
					value={`$${analytics.metrics.burnRate.toFixed(2)}`}
					subtitle="Average spending per day"
					variant="default"
				/>
			</div>
			<div class="min-w-[280px] snap-center shrink-0">
				<MetricCard
					title="Runway"
					value={`${Math.floor(analytics.metrics.runway)} days`}
					subtitle="Until balance reaches $0"
					variant={analytics.metrics.runway > 30 ? 'success' : analytics.metrics.runway > 14 ? 'warning' : 'danger'}
				/>
			</div>
			<div class="min-w-[280px] snap-center shrink-0">
				<MetricCard
					title="Monthly Obligations"
					value={`$${analytics.metrics.totalMonthlyObligations.toFixed(2)}`}
					subtitle="Bills + Buckets + Debts"
					variant="default"
				/>
			</div>
			{#if analytics.metrics.nextPayday}
				<div class="min-w-[280px] snap-center shrink-0">
					<MetricCard
						title="Next Payday"
						value={format(analytics.metrics.nextPayday, 'MMM d')}
						subtitle={format(analytics.metrics.nextPayday, 'yyyy')}
						variant="default"
					/>
				</div>
			{/if}
		</div>

		<!-- Desktop: Grid -->
		<div class="hidden md:grid md:gap-4 md:grid-cols-2 lg:grid-cols-3">
			<MetricCard
				title="Current Balance"
				value={analytics.metrics.currentBalance !== null
					? `$${analytics.metrics.currentBalance.toFixed(2)}`
					: 'Not set'}
				subtitle={analytics.metrics.currentBalance !== null ? 'Updated today' : 'Click above to set'}
				variant={analytics.metrics.currentBalance !== null && analytics.metrics.currentBalance > 0 ? 'default' : 'danger'}
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
		</div>
	</div>

	<!-- Cash Flow Projection Chart -->
	{#if !needsSetup}
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
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Additional Warnings</h2>
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
		</div>
	{/if}
</div>
