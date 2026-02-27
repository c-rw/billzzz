<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		children,
		cols = 2,
		lgCols
	}: {
		children: Snippet;
		cols?: number;
		lgCols?: number;
	} = $props();

	// Full class names required so Tailwind v4 scanner sees them at build time.
	const mdColsClass: Record<number, string> = {
		1: 'md:grid-cols-1',
		2: 'md:grid-cols-2',
		3: 'md:grid-cols-3',
		4: 'md:grid-cols-4',
		5: 'md:grid-cols-5',
		6: 'md:grid-cols-6'
	};

	const lgColsClass: Record<number, string> = {
		1: 'lg:grid-cols-1',
		2: 'lg:grid-cols-2',
		3: 'lg:grid-cols-3',
		4: 'lg:grid-cols-4',
		5: 'lg:grid-cols-5',
		6: 'lg:grid-cols-6'
	};

	const mdCols = $derived(mdColsClass[cols] ?? 'md:grid-cols-2');
	const lgCols_ = $derived(lgCols ? lgColsClass[lgCols] : '');
</script>

<!--
  Mobile: horizontal snap-scroll flex.
  Desktop (md+): CSS grid with configurable column count.
  [&>*]: selectors apply min-width / snap constraints to children on mobile,
  then reset them on md+ where grid takes over.
-->
<div
	class="mb-8 flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 no-scrollbar
	       [&>*]:min-w-[280px] [&>*]:snap-center [&>*]:shrink-0
	       md:grid md:gap-4 md:[&>*]:min-w-0 md:[&>*]:shrink
	       {mdCols} {lgCols_}"
>
	{@render children()}
</div>
