<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		onclick: () => void;
		title?: string;
		children: Snippet;
	}

	let { onclick, title, children }: Props = $props();
</script>

<button
	{onclick}
	{title}
	class="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95 md:hidden dark:bg-blue-700 dark:hover:bg-blue-800"
>
	{@render children()}
</button>
