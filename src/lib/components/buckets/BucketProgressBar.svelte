<script lang="ts">
	interface CurrentCycle {
		startingBalance: number;
		totalSpent: number;
		remaining: number;
	}

	let {
		currentCycle
	}: {
		currentCycle: CurrentCycle;
	} = $props();

	const progressPercentage = $derived(
		currentCycle.startingBalance > 0
			? Math.min((currentCycle.totalSpent / currentCycle.startingBalance) * 100, 100)
			: 0
	);

	const displayPercentage = $derived(
		currentCycle.startingBalance > 0
			? Math.min(
					Math.round((currentCycle.totalSpent / currentCycle.startingBalance) * 100),
					100
				)
			: 0
	);

	const barColor = $derived(
		currentCycle.remaining < 0
			? 'bg-red-500'
			: currentCycle.totalSpent / currentCycle.startingBalance > 0.8
				? 'bg-yellow-500'
				: 'bg-green-500'
	);
</script>

<div class="mb-8 rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
	<div class="mb-2 flex items-center justify-between text-sm">
		<span class="text-gray-600 dark:text-gray-400">Budget Progress</span>
		<span class="font-medium text-gray-900 dark:text-gray-100">
			{displayPercentage}%
		</span>
	</div>
	<div class="h-3 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
		<div
			class="h-full transition-all {barColor}"
			style="width: {progressPercentage}%"
		></div>
	</div>
</div>
