<script lang="ts">
	import type { Category } from '$lib/types/bill';

	interface Props {
		category?: Category | null;
	}

	let { category }: Props = $props();
</script>

{#if category}
	<span
		class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
		style="background-color: {category.color}20; color: {category.color}; border: 1px solid {category.color}40;"
	>
		{#if category.icon}
			<span>{category.icon}</span>
		{/if}
		{category.name}
	</span>
{:else}
	<span class="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
		Uncategorized
	</span>
{/if}
