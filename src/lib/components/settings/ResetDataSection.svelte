<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	let {
		onReset
	}: {
		onReset: () => void;
	} = $props();

	let isExpanded = $state(false);
</script>

<div class="mb-8 rounded-lg border border-red-200 bg-white shadow-sm dark:bg-gray-800 dark:border-red-700">
	<button
		type="button"
		onclick={() => isExpanded = !isExpanded}
		class="w-full border-b border-red-200 px-6 py-4 dark:border-red-700 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
	>
		<div class="text-left">
			<h2 class="text-xl font-semibold text-red-900 dark:text-red-200">Danger Zone</h2>
			<p class="mt-1 text-sm text-red-600 dark:text-red-300">
				Irreversible actions that will permanently delete your data
			</p>
		</div>
		{#if isExpanded}
			<ChevronUp class="h-5 w-5 text-red-400" />
		{:else}
			<ChevronDown class="h-5 w-5 text-red-400" />
		{/if}
	</button>

	{#if isExpanded}
	<div class="p-6">
		<div class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900">
			<div class="flex items-start gap-3">
				<div
					class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-100 dark:bg-red-800"
				>
					<svg
						class="h-5 w-5 text-red-600 dark:text-red-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
						/>
					</svg>
				</div>
				<div class="flex-1">
					<h3 class="text-sm font-medium text-red-900 dark:text-red-200">Reset All Data</h3>
					<p class="mt-1 text-sm text-red-700 dark:text-red-300">
						Permanently delete all bills, buckets, debts, categories, payment history, and
						settings. This action cannot be undone.
					</p>
					<Button variant="danger" size="md" onclick={onReset} class="mt-3">
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
							/>
						</svg>
						Reset All Data
					</Button>
				</div>
			</div>
		</div>
	</div>
	{/if}
</div>
