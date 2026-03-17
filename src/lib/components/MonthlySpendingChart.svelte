<script lang="ts">
	import type { SpendingByMonth } from '$lib/server/db/analytics-queries';

	let { data }: { data: SpendingByMonth[] } = $props();

	const svgWidth = 600;
	const svgHeight = 280;
	const padLeft = 64;
	const padRight = 16;
	const padTop = 16;
	const padBottom = 44;
	const chartW = svgWidth - padLeft - padRight;
	const chartH = svgHeight - padTop - padBottom;

	const maxSpent = $derived(data.length > 0 ? Math.max(...data.map((d) => d.totalSpent)) : 0);

	const barSpacing = $derived(data.length > 0 ? chartW / data.length : chartW);
	const barWidth = $derived(barSpacing * 0.6);

	function xCenter(i: number) {
		return padLeft + i * barSpacing + barSpacing / 2;
	}

	function barH(spent: number) {
		if (maxSpent === 0) return 0;
		return (spent / maxSpent) * chartH;
	}

	const yTicks = $derived.by(() => {
		if (maxSpent === 0) return [0];
		const rawStep = maxSpent / 4;
		const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
		const step = Math.ceil(rawStep / magnitude) * magnitude;
		return [0, step, step * 2, step * 3, step * 4];
	});

	function fmtTick(v: number) {
		if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
		return `$${v}`;
	}
</script>

{#if data.length === 0}
	<p class="text-sm text-gray-500 dark:text-gray-400">No spending data for this period.</p>
{:else}
	<svg viewBox="0 0 {svgWidth} {svgHeight}" class="w-full" role="img" aria-label="Monthly spending chart">
		<!-- Grid lines + Y labels -->
		{#each yTicks as tick}
			{@const y = padTop + chartH - (maxSpent > 0 ? (tick / maxSpent) * chartH : 0)}
			<line
				x1={padLeft}
				x2={svgWidth - padRight}
				y1={y}
				y2={y}
				stroke-dasharray="4 3"
				class="stroke-gray-200 dark:stroke-gray-700"
			/>
			<text
				x={padLeft - 6}
				y={y + 4}
				text-anchor="end"
				font-size="11"
				class="fill-gray-400 dark:fill-gray-500"
			>
				{fmtTick(tick)}
			</text>
		{/each}

		<!-- Bars -->
		{#each data as month, i}
			{@const bh = barH(month.totalSpent)}
			{@const cx = xCenter(i)}
			<rect
				x={cx - barWidth / 2}
				y={padTop + chartH - bh}
				width={barWidth}
				height={bh}
				rx="3"
				class="fill-blue-500 dark:fill-blue-400"
			/>
			<text
				x={cx}
				y={svgHeight - 6}
				text-anchor="middle"
				font-size="11"
				class="fill-gray-500 dark:fill-gray-400"
			>
				{month.monthLabel}
			</text>
		{/each}

		<!-- Axes -->
		<line
			x1={padLeft}
			x2={padLeft}
			y1={padTop}
			y2={padTop + chartH}
			class="stroke-gray-300 dark:stroke-gray-600"
		/>
		<line
			x1={padLeft}
			x2={svgWidth - padRight}
			y1={padTop + chartH}
			y2={padTop + chartH}
			class="stroke-gray-300 dark:stroke-gray-600"
		/>
	</svg>
{/if}
