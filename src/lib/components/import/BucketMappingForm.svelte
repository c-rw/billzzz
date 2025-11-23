<script lang="ts">
	let {
		index,
		bucketName = $bindable(),
		budgetAmount = $bindable(),
		frequency = $bindable(),
		anchorDate = $bindable()
	}: {
		index: number;
		bucketName: string | undefined;
		budgetAmount: number | undefined;
		frequency: string | undefined;
		anchorDate: string | undefined;
	} = $props();
</script>

<div class="grid grid-cols-2 gap-3">
	<div>
		<label for="bucketName_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Bucket Name
		</label>
		<input
			id="bucketName_{index}"
			type="text"
			bind:value={bucketName}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		/>
	</div>
	<div>
		<label for="budgetAmount_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Budget Amount
		</label>
		<input
			id="budgetAmount_{index}"
			type="number"
			step="0.01"
			bind:value={budgetAmount}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		/>
	</div>
	<div>
		<label for="frequency_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Frequency
		</label>
		<select
			id="frequency_{index}"
			bind:value={frequency}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		>
			<option value="weekly">Weekly</option>
			<option value="biweekly">Biweekly</option>
			<option value="monthly">Monthly</option>
			<option value="quarterly">Quarterly</option>
			<option value="yearly">Yearly</option>
		</select>
	</div>
	<div>
		<label for="anchorDate_{index}" class="block text-xs text-gray-600 dark:text-gray-400 mb-1">
			Start Date
		</label>
		<input
			id="anchorDate_{index}"
			type="date"
			bind:value={anchorDate}
			class="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800 focus:border-transparent"
		/>
	</div>
</div>
