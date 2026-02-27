<script lang="ts">
	let {
		label,
		value,
		valueClass = 'text-gray-900 dark:text-gray-100'
	}: {
		label: string;
		value: string;
		valueClass?: string;
	} = $props();
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
	<p class="text-sm text-gray-500 dark:text-gray-400">{label}</p>
	<p class="mt-1 text-2xl font-semibold {valueClass}">{value}</p>
</div>
