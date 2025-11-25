<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import { formatCurrency } from '$lib/utils/format';
	import { format } from 'date-fns';
	import { ArrowLeft, Calendar, DollarSign, TrendingUp } from 'lucide-svelte';

	export let data: PageData;

	$: bill = data.bill;
	$: currentCycle = bill.currentCycle;
	$: cycles = data.cycles;
	$: payments = data.payments;

	// Group payments by cycle
	$: paymentsByCycle = payments.reduce((acc, payment) => {
		if (!acc[payment.cycleId]) {
			acc[payment.cycleId] = [];
		}
		acc[payment.cycleId].push(payment);
		return acc;
	}, {} as Record<number, typeof payments>);

	function getCycleName(cycle: typeof cycles[0]) {
		const start = format(cycle.startDate, 'MMM d, yyyy');
		const end = format(cycle.endDate, 'MMM d, yyyy');
		return `${start} - ${end}`;
	}

	function getProgressPercentage(totalPaid: number, expectedAmount: number) {
		return expectedAmount > 0 ? Math.min((totalPaid / expectedAmount) * 100, 100) : 0;
	}

	function getStatusColor(isPaid: boolean, totalPaid: number, expectedAmount: number) {
		if (isPaid || totalPaid >= expectedAmount) return 'bg-green-500';
		if (totalPaid > 0) return 'bg-yellow-500';
		return 'bg-gray-300 dark:bg-gray-600';
	}
</script>

<div class="container mx-auto px-4 py-8 max-w-6xl">
	<!-- Header -->
	<div class="mb-6">
		<button
			on:click={() => goto('/')}
			class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
		>
			<ArrowLeft class="w-4 h-4" />
			Back to Bills
		</button>

		<div class="flex items-start justify-between">
			<div>
				<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{bill.name}</h1>
				<p class="text-gray-600 dark:text-gray-400 mt-1">
					{#if bill.isRecurring}
						Recurring {bill.recurrenceType} • Due {format(bill.dueDate, 'MMM d, yyyy')}
					{:else}
						One-time bill • Due {format(bill.dueDate, 'MMM d, yyyy')}
					{/if}
				</p>
			</div>
			<div class="text-right">
				<p class="text-sm text-gray-600 dark:text-gray-400">Expected Amount</p>
				<p class="text-2xl font-bold text-gray-900 dark:text-gray-100">
					{formatCurrency(bill.amount)}
				</p>
			</div>
		</div>
	</div>

	<!-- Current Cycle Card -->
	{#if currentCycle}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
			<div class="flex items-center gap-2 mb-4">
				<Calendar class="w-5 h-5 text-blue-600 dark:text-blue-400" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Current Cycle</h2>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Period</p>
					<p class="text-lg font-medium text-gray-900 dark:text-gray-100">
						{format(currentCycle.startDate, 'MMM d')} - {format(currentCycle.endDate, 'MMM d, yyyy')}
					</p>
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
					<p class="text-lg font-medium text-gray-900 dark:text-gray-100">
						{formatCurrency(currentCycle.totalPaid)}
					</p>
				</div>
				<div>
					<p class="text-sm text-gray-600 dark:text-gray-400">Remaining</p>
					<p class="text-lg font-medium text-gray-900 dark:text-gray-100">
						{formatCurrency(currentCycle.remaining)}
					</p>
				</div>
			</div>

			<!-- Progress Bar -->
			<div class="mb-2">
				<div class="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
					<span>Progress</span>
					<span>{currentCycle.percentPaid.toFixed(0)}%</span>
				</div>
				<div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
					<div
						class="h-3 rounded-full transition-all {getStatusColor(
							currentCycle.isPaid,
							currentCycle.totalPaid,
							currentCycle.expectedAmount
						)}"
						style="width: {currentCycle.percentPaid}%"
					></div>
				</div>
			</div>

			<!-- Current Cycle Payments -->
			{#if paymentsByCycle[currentCycle.id]?.length > 0}
				<div class="mt-4">
					<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
						Payments This Cycle
					</h3>
					<div class="space-y-2">
						{#each paymentsByCycle[currentCycle.id] as payment}
							<div
								class="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700 rounded"
							>
								<div class="flex items-center gap-3">
									<DollarSign class="w-4 h-4 text-green-600 dark:text-green-400" />
									<div>
										<p class="text-sm font-medium text-gray-900 dark:text-gray-100">
											{formatCurrency(payment.amount)}
										</p>
										{#if payment.notes}
											<p class="text-xs text-gray-600 dark:text-gray-400">{payment.notes}</p>
										{/if}
									</div>
								</div>
								<p class="text-sm text-gray-600 dark:text-gray-400">
									{format(payment.paymentDate, 'MMM d, yyyy')}
								</p>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
			<p class="text-sm text-yellow-800 dark:text-yellow-200">
				No current billing cycle. Cycles will be generated automatically when payments are recorded.
			</p>
		</div>
	{/if}

	<!-- Cycle History -->
	{#if cycles.length > 0}
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
			<div class="flex items-center gap-2 mb-4">
				<TrendingUp class="w-5 h-5 text-purple-600 dark:text-purple-400" />
				<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Payment History</h2>
			</div>

			<div class="space-y-4">
				{#each cycles as cycle}
					<div class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
						<div class="flex items-center justify-between mb-3">
							<div>
								<h3 class="font-medium text-gray-900 dark:text-gray-100">
									{getCycleName(cycle)}
								</h3>
								<p class="text-sm text-gray-600 dark:text-gray-400">
									Expected: {formatCurrency(cycle.expectedAmount)}
								</p>
							</div>
							<div class="text-right">
								<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
									{formatCurrency(cycle.totalPaid)}
								</p>
								{#if cycle.isPaid}
									<span class="text-xs text-green-600 dark:text-green-400 font-medium">Paid</span>
								{:else if cycle.totalPaid > 0}
									<span class="text-xs text-yellow-600 dark:text-yellow-400 font-medium">
										Partial ({getProgressPercentage(cycle.totalPaid, cycle.expectedAmount).toFixed(0)}%)
									</span>
								{:else}
									<span class="text-xs text-gray-500 dark:text-gray-400">Unpaid</span>
								{/if}
							</div>
						</div>

						<!-- Payments in this cycle -->
						{#if paymentsByCycle[cycle.id]?.length > 0}
							<div class="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
								<div class="space-y-1">
									{#each paymentsByCycle[cycle.id] as payment}
										<div class="flex items-center justify-between text-sm">
											<span class="text-gray-600 dark:text-gray-400">
												{format(payment.paymentDate, 'MMM d, yyyy')}
												{#if payment.notes}
													<span class="text-xs">• {payment.notes}</span>
												{/if}
											</span>
											<span class="font-medium text-gray-900 dark:text-gray-100">
												{formatCurrency(payment.amount)}
											</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{:else}
		<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
			<p class="text-gray-600 dark:text-gray-400">No payment history yet</p>
		</div>
	{/if}
</div>
