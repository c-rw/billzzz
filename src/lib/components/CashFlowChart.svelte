<script lang="ts">
	import { format } from 'date-fns';
	import type { CashFlowDataPoint } from '$lib/server/db/analytics-queries';

	let {
		data
	}: {
		data: CashFlowDataPoint[];
	} = $props();

	// Chart dimensions
	const width = 1000;
	const height = 400;
	const padding = { top: 20, right: 20, bottom: 60, left: 60 };
	const chartWidth = width - padding.left - padding.right;
	const chartHeight = height - padding.top - padding.bottom;

	// Calculate scales
	const minBalance = $derived(Math.min(...data.map((d) => d.balance), 0));
	const maxBalance = $derived(Math.max(...data.map((d) => d.balance), 0));
	const balanceRange = $derived(maxBalance - minBalance);

	// Add 10% padding to y-axis
	const yMin = $derived(minBalance - balanceRange * 0.1);
	const yMax = $derived(maxBalance + balanceRange * 0.1);

	// Scale functions
	const xScale = $derived((index: number) => {
		return (index / (data.length - 1)) * chartWidth;
	});

	const yScale = $derived((balance: number) => {
		return chartHeight - ((balance - yMin) / (yMax - yMin)) * chartHeight;
	});

	// Generate path for the line
	const linePath = $derived.by(() => {
		if (data.length === 0) return '';

		const points = data.map((d, i) => {
			const x = xScale(i);
			const y = yScale(d.balance);
			return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
		});

		return points.join(' ');
	});

	// Generate area fill
	const areaPath = $derived.by(() => {
		if (data.length === 0) return '';

		const points = data.map((d, i) => {
			const x = xScale(i);
			const y = yScale(d.balance);
			return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
		});

		// Close the path at the bottom
		points.push(`L ${chartWidth} ${chartHeight}`);
		points.push(`L 0 ${chartHeight}`);
		points.push('Z');

		return points.join(' ');
	});

	// Y-axis ticks
	const yTicks = $derived.by(() => {
		const tickCount = 5;
		const ticks = [];
		for (let i = 0; i <= tickCount; i++) {
			const value = yMin + (i / tickCount) * (yMax - yMin);
			ticks.push({
				value,
				y: yScale(value)
			});
		}
		return ticks;
	});

	// X-axis ticks (show dates for every 2 weeks)
	const xTicks = $derived.by(() => {
		const tickInterval = Math.floor(data.length / 6); // Show ~6 ticks
		const ticks = [];
		for (let i = 0; i < data.length; i += tickInterval) {
			ticks.push({
				date: data[i].date,
				x: xScale(i),
				label: format(data[i].date, 'MMM d')
			});
		}
		return ticks;
	});

	// Zero line position
	const zeroY = $derived(yScale(0));

	// Hover state
	let hoveredIndex = $state<number | null>(null);
	let hoveredPoint = $derived(hoveredIndex !== null ? data[hoveredIndex] : null);

	function handleMouseMove(event: MouseEvent) {
		const svg = event.currentTarget as SVGElement;
		const rect = svg.getBoundingClientRect();
		const x = event.clientX - rect.left - padding.left;

		if (x < 0 || x > chartWidth) {
			hoveredIndex = null;
			return;
		}

		// Find nearest data point
		const index = Math.round((x / chartWidth) * (data.length - 1));
		hoveredIndex = Math.max(0, Math.min(index, data.length - 1));
	}

	function handleMouseLeave() {
		hoveredIndex = null;
	}
</script>

<div class="relative w-full" style="aspect-ratio: 2.5/1;">
	<svg
		viewBox="0 0 {width} {height}"
		class="w-full h-full"
		role="img"
		aria-label="Cash flow projection chart"
		onmousemove={handleMouseMove}
		onmouseleave={handleMouseLeave}
	>
		<!-- Chart area -->
		<g transform="translate({padding.left}, {padding.top})">
			<!-- Y-axis grid lines -->
			{#each yTicks as tick}
				<line
					x1="0"
					y1={tick.y}
					x2={chartWidth}
					y2={tick.y}
					stroke="currentColor"
					class="stroke-gray-200 dark:stroke-gray-700"
					stroke-width="1"
					opacity="0.5"
				/>
			{/each}

			<!-- Zero line (emphasized) -->
			{#if zeroY >= 0 && zeroY <= chartHeight}
				<line
					x1="0"
					y1={zeroY}
					x2={chartWidth}
					y2={zeroY}
					stroke="currentColor"
					class="stroke-gray-400 dark:stroke-gray-500"
					stroke-width="2"
					stroke-dasharray="4"
				/>
			{/if}

			<!-- Area fill (gradient based on positive/negative) -->
			<defs>
				<linearGradient id="balanceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
					<stop offset="0%" class="stop-color-blue-500" stop-opacity="0.3" />
					<stop offset="100%" class="stop-color-blue-500" stop-opacity="0.05" />
				</linearGradient>
			</defs>

			<path
				d={areaPath}
				fill="url(#balanceGradient)"
				class="fill-blue-500/20"
			/>

			<!-- Main line -->
			<path
				d={linePath}
				fill="none"
				stroke="currentColor"
				class="stroke-blue-600 dark:stroke-blue-400"
				stroke-width="3"
				stroke-linecap="round"
				stroke-linejoin="round"
			/>

			<!-- Income markers (paydays) -->
			{#each data as point, i}
				{#if point.income > 0}
					<circle
						cx={xScale(i)}
						cy={yScale(point.balance)}
						r="5"
						fill="currentColor"
						class="fill-green-500 dark:fill-green-400"
					/>
				{/if}
			{/each}

			<!-- Hover indicator -->
			{#if hoveredPoint && hoveredIndex !== null}
				<line
					x1={xScale(hoveredIndex)}
					y1="0"
					x2={xScale(hoveredIndex)}
					y2={chartHeight}
					stroke="currentColor"
					class="stroke-gray-400 dark:stroke-gray-500"
					stroke-width="1"
					stroke-dasharray="3"
				/>
				<circle
					cx={xScale(hoveredIndex)}
					cy={yScale(hoveredPoint.balance)}
					r="6"
					fill="currentColor"
					class="fill-blue-600 dark:fill-blue-400"
					stroke="white"
					stroke-width="2"
				/>
			{/if}

			<!-- Y-axis -->
			<line
				x1="0"
				y1="0"
				x2="0"
				y2={chartHeight}
				stroke="currentColor"
				class="stroke-gray-300 dark:stroke-gray-600"
				stroke-width="2"
			/>

			<!-- Y-axis labels -->
			{#each yTicks as tick}
				<text
					x="-10"
					y={tick.y}
					text-anchor="end"
					dominant-baseline="middle"
					class="fill-gray-600 dark:fill-gray-400 text-xs"
				>
					${tick.value.toFixed(0)}
				</text>
			{/each}

			<!-- X-axis -->
			<line
				x1="0"
				y1={chartHeight}
				x2={chartWidth}
				y2={chartHeight}
				stroke="currentColor"
				class="stroke-gray-300 dark:stroke-gray-600"
				stroke-width="2"
			/>

			<!-- X-axis labels -->
			{#each xTicks as tick}
				<text
					x={tick.x}
					y={chartHeight + 20}
					text-anchor="middle"
					class="fill-gray-600 dark:fill-gray-400 text-xs"
				>
					{tick.label}
				</text>
			{/each}
		</g>
	</svg>

	<!-- Tooltip -->
	{#if hoveredPoint && hoveredIndex !== null}
		<div
			class="absolute pointer-events-none rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow-lg"
			style="left: {padding.left + xScale(hoveredIndex)}px; top: {padding.top + yScale(hoveredPoint.balance) - 80}px; transform: translate(-50%, -100%);"
		>
			<p class="text-xs font-semibold text-gray-900 dark:text-gray-100">
				{format(hoveredPoint.date, 'MMM d, yyyy')}
			</p>
			<p class="mt-1 text-sm font-bold {hoveredPoint.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
				Balance: ${hoveredPoint.balance.toFixed(2)}
			</p>
			{#if hoveredPoint.income > 0}
				<p class="mt-1 text-xs text-green-600 dark:text-green-400">
					Income: +${hoveredPoint.income.toFixed(2)}
				</p>
			{/if}
			{#if hoveredPoint.expenses > 0}
				<p class="mt-1 text-xs text-red-600 dark:text-red-400">
					Expenses: -${hoveredPoint.expenses.toFixed(2)}
				</p>
			{/if}
			{#if hoveredPoint.events.length > 0}
				<div class="mt-2 border-t border-gray-200 dark:border-gray-700 pt-2">
					<p class="text-xs font-medium text-gray-700 dark:text-gray-300">Events:</p>
					{#each hoveredPoint.events.slice(0, 3) as event}
						<p class="text-xs text-gray-600 dark:text-gray-400">
							{event.description}: ${event.amount.toFixed(2)}
						</p>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Legend -->
<div class="mt-4 flex flex-wrap gap-4 justify-center text-sm">
	<div class="flex items-center gap-2">
		<div class="h-3 w-3 rounded-full bg-blue-600 dark:bg-blue-400"></div>
		<span class="text-gray-600 dark:text-gray-400">Projected Balance</span>
	</div>
	<div class="flex items-center gap-2">
		<div class="h-3 w-3 rounded-full bg-green-500 dark:bg-green-400"></div>
		<span class="text-gray-600 dark:text-gray-400">Income (Payday)</span>
	</div>
	<div class="flex items-center gap-2">
		<div class="h-3 w-8 border-t-2 border-dashed border-gray-400"></div>
		<span class="text-gray-600 dark:text-gray-400">Zero Line</span>
	</div>
</div>
