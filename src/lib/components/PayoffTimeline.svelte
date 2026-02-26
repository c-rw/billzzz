<script lang="ts">
	import type { PayoffSchedule } from '$lib/types/debt';
	import { format } from 'date-fns';
	import { formatCurrency } from '$lib/utils/format';

	interface Props {
		schedule: PayoffSchedule;
	}

	let { schedule }: Props = $props();

	// Show first 12 months by default, with option to load more
	let visibleMonths = $state(12);

	function loadMore() {
		visibleMonths = Math.min(visibleMonths + 12, schedule.timeline.length);
	}

	const visibleTimeline = $derived(schedule.timeline.slice(0, visibleMonths));

	// Get unique debt names from the first month (all months have the same debts)
	const debtNames = $derived(
		schedule.timeline.length > 0
			? schedule.timeline[0].debts.map((d) => ({ id: d.debtId, name: d.debtName }))
			: []
	);
</script>

<div class="space-y-4">
	<!-- Summary Header -->
	<div class="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 p-6 rounded-lg">
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div>
				<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Debt-Free Date</p>
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">
					{format(schedule.debtFreeDate, 'MMM d, yyyy')}
				</p>
			</div>
			<div>
				<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Months</p>
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">{schedule.totalMonths}</p>
			</div>
			<div>
				<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Interest</p>
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(schedule.totalInterestPaid)}</p>
			</div>
			<div>
				<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Monthly Payment</p>
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(schedule.monthlyPayment)}</p>
			</div>
		</div>
	</div>

	<!-- Timeline -->
	<div class="space-y-2">
		{#each visibleTimeline as monthDetail}
			{@const activeDebts = monthDetail.debts.filter((d) => d.payment > 0 || d.remainingBalance > 0)}
			{@const paidOffThisMonth = monthDetail.debts.filter(
				(d) => d.payment > 0 && d.remainingBalance === 0 && monthDetail.month > 1
			)}

			<div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
				<!-- Month Header -->
				<div class="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800">
					<div class="flex items-center gap-3">
						<span class="text-xs font-medium text-gray-500 dark:text-gray-400 w-6 text-right">
							{monthDetail.month}
						</span>
						<span class="text-sm font-semibold text-gray-900 dark:text-gray-100">
							{format(monthDetail.date, 'MMM yyyy')}
						</span>
						{#each paidOffThisMonth as debt}
							<span class="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">
								{debt.debtName} paid off!
							</span>
						{/each}
					</div>
					<div class="flex items-center gap-4 text-sm">
						<span class="text-gray-600 dark:text-gray-400">
							Total: <strong class="text-gray-900 dark:text-gray-100">{formatCurrency(monthDetail.totalPayment)}</strong>
						</span>
						<span class="text-red-600 dark:text-red-400">
							Interest: <strong>{formatCurrency(monthDetail.totalInterest)}</strong>
						</span>
						<span class="text-gray-600 dark:text-gray-400">
							Remaining: <strong class="text-gray-900 dark:text-gray-100">{formatCurrency(monthDetail.totalRemaining)}</strong>
						</span>
					</div>
				</div>

				<!-- Per-Debt Breakdown -->
				{#if activeDebts.length > 0}
					<div class="divide-y divide-gray-100 dark:divide-gray-800">
						{#each activeDebts as debt}
							<div class="flex items-center justify-between px-4 py-2 text-sm {debt.remainingBalance === 0 ? 'bg-green-50 dark:bg-green-950/30' : ''}">
								<span class="font-medium text-gray-700 dark:text-gray-300 w-40 truncate" title={debt.debtName}>
									{debt.debtName}
								</span>
								<div class="flex items-center gap-6 text-xs">
									<span class="text-gray-600 dark:text-gray-400 w-24 text-right">
										Payment: <strong class="text-gray-900 dark:text-gray-100">{formatCurrency(debt.payment)}</strong>
									</span>
									<span class="text-gray-600 dark:text-gray-400 w-28 text-right">
										Principal: <strong class="text-gray-900 dark:text-gray-100">{formatCurrency(debt.principal)}</strong>
									</span>
									<span class="w-24 text-right">
										Interest: <strong class="text-red-600 dark:text-red-400">{formatCurrency(debt.interest)}</strong>
									</span>
									<span class="text-gray-600 dark:text-gray-400 w-28 text-right">
										Balance: <strong class="{debt.remainingBalance === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'}">{formatCurrency(debt.remainingBalance)}</strong>
									</span>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<!-- Load More Button -->
	{#if visibleMonths < schedule.timeline.length}
		<div class="text-center pt-4">
			<button
				onclick={loadMore}
				class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800"
			>
				Load Next 12 Months ({schedule.timeline.length - visibleMonths} remaining)
			</button>
		</div>
	{/if}

	<!-- Summary Footer -->
	<div class="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
		<div class="grid grid-cols-2 gap-4 text-sm">
			<div>
				<span class="text-gray-600 dark:text-gray-400">Total Principal Paid:</span>
				<span class="font-semibold text-gray-900 dark:text-gray-100 ml-2">
					{formatCurrency(schedule.totalPrincipalPaid)}
				</span>
			</div>
			<div>
				<span class="text-gray-600 dark:text-gray-400">Total Interest Paid:</span>
				<span class="font-semibold text-red-600 dark:text-red-400 ml-2">
					{formatCurrency(schedule.totalInterestPaid)}
				</span>
			</div>
		</div>
	</div>
</div>
