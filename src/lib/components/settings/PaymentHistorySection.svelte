<script lang="ts">
	import { format } from 'date-fns';

	type PaymentHistoryItem = {
		id: number;
		billName: string;
		amount: number;
		paymentDate: Date;
		notes: string | null;
	};

	let {
		paymentHistory,
		onDelete
	}: {
		paymentHistory: PaymentHistoryItem[];
		onDelete: (id: number, billName: string) => void;
	} = $props();
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<div class="border-b border-gray-200 px-6 py-4">
		<h2 class="text-xl font-semibold text-gray-900">Payment History</h2>
		<p class="mt-1 text-sm text-gray-600">
			View and manage all payment records. Remove accidental payments here.
		</p>
	</div>

	<div class="p-6">
		{#if paymentHistory.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No payment history</h3>
				<p class="mt-1 text-sm text-gray-500">
					Payment records will appear here when you mark bills as paid.
				</p>
			</div>
		{:else}
			<div class="overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Bill Name
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Amount
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Payment Date
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
							>
								Notes
							</th>
							<th class="relative px-6 py-3">
								<span class="sr-only">Actions</span>
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each paymentHistory as payment (payment.id)}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4">
									<div class="text-sm font-medium text-gray-900">{payment.billName}</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<div class="text-sm text-gray-900">${payment.amount.toFixed(2)}</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4">
									<div class="text-sm text-gray-900">
										{format(payment.paymentDate, 'MMM d, yyyy h:mm a')}
									</div>
								</td>
								<td class="px-6 py-4">
									<div class="text-sm text-gray-500">
										{payment.notes || '-'}
									</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
									<button
										onclick={() => onDelete(payment.id, payment.billName)}
										class="text-red-600 hover:text-red-900"
									>
										Remove
									</button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<div class="mt-4 text-sm text-gray-500">
				Total records: {paymentHistory.length}
			</div>
		{/if}
	</div>
</div>
