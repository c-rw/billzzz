<script lang="ts">
	import type { BillWithCategory } from '$lib/types/bill';
	import StatusIndicator from './StatusIndicator.svelte';
	import CategoryBadge from './CategoryBadge.svelte';
	import { format } from 'date-fns';
	import { getRecurrenceDescription } from '$lib/utils/recurrence';

	interface Props {
		bill: BillWithCategory;
		onTogglePaid?: (id: number, isPaid: boolean) => void;
		onEdit?: (id: number) => void;
		onDelete?: (id: number) => void;
	}

	let { bill, onTogglePaid, onEdit, onDelete }: Props = $props();

	async function handleTogglePaid() {
		if (onTogglePaid) {
			onTogglePaid(bill.id, !bill.isPaid);
		}
	}

	async function handleEdit() {
		if (onEdit) {
			onEdit(bill.id);
		}
	}

	async function handleDelete() {
		if (onDelete && confirm('Are you sure you want to delete this bill?')) {
			onDelete(bill.id);
		}
	}
</script>

<div class="group relative flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
	<div class="p-4">
		<div class="mb-2 flex items-center gap-2">
			<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{bill.name}</h3>
			{#if bill.isRecurring}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-950 dark:text-blue-400"
					title={bill.recurrenceType ? getRecurrenceDescription(bill.recurrenceType as any, bill.recurrenceDay) : ''}
				>
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							fill-rule="evenodd"
							d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
							clip-rule="evenodd"
						/>
					</svg>
					Recurring
				</span>
			{/if}
			{#if bill.isAutopay}
				<span
					class="inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs text-green-700 dark:bg-green-950 dark:text-green-400"
					title="This bill is set to autopay"
				>
					<svg class="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
						<path
							d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"
						/>
						<path
							fill-rule="evenodd"
							d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z"
							clip-rule="evenodd"
						/>
					</svg>
					Autopay
				</span>
			{/if}
		</div>

		<div class="mb-3 flex items-center gap-3">
			<StatusIndicator dueDate={bill.dueDate} isPaid={bill.isPaid} />
			<CategoryBadge category={bill.category} />
		</div>

		<div class="grid grid-cols-2 gap-3 text-sm">
			<div>
				<span class="text-gray-500 dark:text-gray-400">Amount:</span>
				<span class="ml-2 font-semibold text-gray-900 dark:text-gray-100">${bill.amount.toFixed(2)}</span>
			</div>
			<div>
				<span class="text-gray-500 dark:text-gray-400">Due:</span>
				<span class="ml-2 font-medium text-gray-900 dark:text-gray-100">{format(bill.dueDate, 'MMM d, yyyy')}</span>
			</div>
		</div>

		{#if bill.notes}
			<p class="mt-2 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{bill.notes}</p>
		{/if}
	</div>

	<!-- Action Buttons -->
	<div class="flex items-center justify-end gap-1 border-t border-gray-100 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900">
		<button
			onclick={handleTogglePaid}
			class="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-300"
			title={bill.isPaid ? 'Mark as unpaid' : 'Mark as paid'}
		>
			{#if bill.isPaid}
				<svg
					class="h-5 w-5 text-green-600"
					fill="currentColor"
					viewBox="0 0 20 20"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			{/if}
		</button>

		{#if bill.paymentLink}
			<a
				href={bill.paymentLink}
				target="_blank"
				rel="noopener noreferrer"
				class="rounded-md p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-950 dark:hover:text-blue-400"
				title="Pay bill"
			>
				<svg
					class="h-5 w-5"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
					/>
				</svg>
			</a>
		{/if}

		<button
			onclick={handleEdit}
			class="rounded-md p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:text-gray-400 dark:hover:bg-blue-950 dark:hover:text-blue-400"
			title="Edit bill"
		>
			<svg
				class="h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
				/>
			</svg>
		</button>

		<button
			onclick={handleDelete}
			class="rounded-md p-2 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-950 dark:hover:text-red-400"
			title="Delete bill"
		>
			<svg
				class="h-5 w-5"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
				xmlns="http://www.w3.org/2000/svg"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
				/>
			</svg>
		</button>
	</div>
</div>
