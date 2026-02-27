<script lang="ts">
	let { status }: { status: string } = $props();

	const variant = $derived.by(() => {
		const s = status.toLowerCase();
		if (s === 'confirmed' || s === 'completed' || s === 'paid') return 'success';
		if (s === 'pending' || s === 'partial') return 'warning';
		if (s === 'rejected' || s === 'failed' || s === 'error') return 'danger';
		return 'neutral';
	});

	const variantClass = $derived(
		{
			success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
			warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
			danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
			neutral: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
		}[variant]
	);
</script>

<span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {variantClass}">
	{status}
</span>
