<script lang="ts">
	import { formatDistanceToNow, isPast, differenceInDays } from 'date-fns';

	interface Props {
		dueDate: Date;
		isPaid: boolean;
	}

	let { dueDate, isPaid }: Props = $props();

	const status = $derived.by(() => {
		if (isPaid) return 'paid';
		if (isPast(dueDate)) return 'overdue';

		const daysUntilDue = differenceInDays(dueDate, new Date());
		if (daysUntilDue <= 7) return 'upcoming';

		return 'pending';
	});

	const statusClasses = {
		paid: 'bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-400 border-green-200 dark:border-green-800',
		overdue: 'bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-400 border-red-200 dark:border-red-800',
		upcoming: 'bg-yellow-100 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
		pending: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
	};

	const statusText = $derived.by(() => {
		if (isPaid) return 'Paid';
		if (status === 'overdue') return `Overdue ${formatDistanceToNow(dueDate)}`;
		return `Due ${formatDistanceToNow(dueDate, { addSuffix: true })}`;
	});
</script>

<span
	class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium {statusClasses[
		status
	]}"
>
	{#if status === 'paid'}
		<svg
			class="h-3 w-3"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
		</svg>
	{:else if status === 'overdue'}
		<svg
			class="h-3 w-3"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	{:else if status === 'upcoming'}
		<svg
			class="h-3 w-3"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	{/if}
	{statusText}
</span>
