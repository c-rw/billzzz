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
		paid: 'bg-green-100 text-green-800 border-green-200',
		overdue: 'bg-red-100 text-red-800 border-red-200',
		upcoming: 'bg-yellow-100 text-yellow-800 border-yellow-200',
		pending: 'bg-gray-100 text-gray-800 border-gray-200'
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
