<script lang="ts">
	let {
		type,
		message
	}: {
		type: 'error' | 'success';
		message: string;
	} = $props();
</script>

{#if type === 'error'}
	<div class="mb-6 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-4">
		<p class="text-sm text-red-800 dark:text-red-200">{message}</p>
	</div>
{:else}
	<div class="mb-6 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-4">
		<p class="text-sm text-green-800 dark:text-green-200">{message}</p>
	</div>
{/if}
