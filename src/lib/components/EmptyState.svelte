<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		icon,
		cta
	}: {
		title: string;
		description?: string;
		icon?: Snippet;
		cta?: Snippet;
	} = $props();
</script>

<div class="rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 p-12 text-center">
	{#if icon}
		<div class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500 [&>svg]:h-full [&>svg]:w-full">
			{@render icon()}
		</div>
	{/if}
	<h3 class="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
	{#if description}
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
	{/if}
	{#if cta}
		<div class="mt-6">
			{@render cta()}
		</div>
	{/if}
</div>
