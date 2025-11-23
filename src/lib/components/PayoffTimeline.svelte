<script lang="ts">
	import type { PayoffSchedule } from '$lib/types/debt';
	import { format } from 'date-fns';

	interface Props {
		schedule: PayoffSchedule;
	}

	let { schedule }: Props = $props();

	let expandedMonths = $state<Set<number>>(new Set());

	function toggleMonth(month: number) {
		const newSet = new Set(expandedMonths);
		if (newSet.has(month)) {
			newSet.delete(month);
		} else {
			newSet.add(month);
		}
		expandedMonths = newSet;
	}

	// Show first 12 months by default, with option to load more
	let visibleMonths = $state(12);

	function loadMore() {
		visibleMonths = Math.min(visibleMonths + 12, schedule.timeline.length);
	}

	const visibleTimeline = $derived(schedule.timeline.slice(0, visibleMonths));
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
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">${schedule.totalInterestPaid.toFixed(2)}</p>
			</div>
			<div>
				<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Monthly Payment</p>
				<p class="text-lg font-bold text-blue-900 dark:text-blue-100">${schedule.monthlyPayment.toFixed(2)}</p>
			</div>
		</div>
	</div>

	<!-- Timeline Table -->
	<div class="overflow-x-auto">
		<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
			<thead class="bg-gray-50 dark:bg-gray-800">
				<tr>
					<th
						class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Month
					</th>
					<th
						class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Date
					</th>
					<th
						class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Payment
					</th>
					<th
						class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Interest
					</th>
					<th
						class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
					>
						Remaining
					</th>
					<th class="px-6 py-3"></th>
				</tr>
			</thead>
			<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
				{#each visibleTimeline as monthDetail}
					{@const isExpanded = expandedMonths.has(monthDetail.month)}
					<tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
						<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
							{monthDetail.month}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-400">
							{format(monthDetail.date, 'MMM yyyy')}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
							${monthDetail.totalPayment.toFixed(2)}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600 dark:text-red-400">
							${monthDetail.totalInterest.toFixed(2)}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-900 dark:text-gray-100">
							${monthDetail.totalRemaining.toFixed(2)}
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
							<button
								onclick={() => toggleMonth(monthDetail.month)}
								class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
							>
								{isExpanded ? 'Hide' : 'Details'}
							</button>
						</td>
					</tr>

					<!-- Expanded Details -->
					{#if isExpanded}
						<tr>
							<td colspan="6" class="px-6 py-4 bg-gray-50 dark:bg-gray-800">
								<div class="space-y-3">
									<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Debt Breakdown:</h4>
									{#each monthDetail.debts as debt}
										{#if debt.payment > 0 || debt.remainingBalance > 0}
											<div class="bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
												<!-- Debt Header -->
												<div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800">
													<span class="text-sm font-medium text-gray-900 dark:text-gray-100">{debt.debtName}</span>
													<div class="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
														<span>Payment: <strong>${debt.payment.toFixed(2)}</strong></span>
														<span>Principal: <strong>${debt.principal.toFixed(2)}</strong></span>
														<span>Interest: <strong class="text-red-600 dark:text-red-400">${debt.interest.toFixed(2)}</strong></span>
														<span>Balance: <strong>${debt.remainingBalance.toFixed(2)}</strong></span>
													</div>
												</div>

											</div>
										{/if}
									{/each}
								</div>
							</td>
						</tr>
					{/if}
				{/each}
			</tbody>
		</table>
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
				<span class="font-semibold text-gray-900 ml-2">
					${schedule.totalPrincipalPaid.toFixed(2)}
				</span>
			</div>
			<div>
				<span class="text-gray-600 dark:text-gray-400">Total Interest Paid:</span>
				<span class="font-semibold text-red-600 ml-2">
					${schedule.totalInterestPaid.toFixed(2)}
				</span>
			</div>
		</div>
	</div>
</div>
