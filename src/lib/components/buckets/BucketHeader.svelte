<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { goto } from '$app/navigation';

	interface Bucket {
		id: number;
		name: string;
		icon: string | null;
	}

	let {
		bucket,
		iconMap,
		onEdit,
		onDelete
	}: {
		bucket: Bucket;
		iconMap: Record<string, any>;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="mb-8">
	<div class="flex items-center gap-3 mb-4">
		<button
			onclick={() => goto('/buckets')}
			class="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
			aria-label="Back to buckets"
		>
			<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M10 19l-7-7m0 0l7-7m-7 7h18"
				/>
			</svg>
		</button>
		{#if bucket.icon && iconMap[bucket.icon]}
			{@const IconComponent = iconMap[bucket.icon]}
			<div class="text-blue-600 dark:text-blue-400">
				<IconComponent size={32} />
			</div>
		{/if}
		<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{bucket.name}</h1>
	</div>

	<div class="flex items-center gap-3">
		<Button variant="secondary" onclick={onEdit}>
			Edit Bucket
		</Button>
		<Button
			variant="secondary"
			onclick={onDelete}
			class="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900"
		>
			Delete Bucket
		</Button>
	</div>
</div>
