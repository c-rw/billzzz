<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { PaydaySettings } from '$lib/server/db/schema';

	let {
		paydaySettings,
		onEdit,
		onDelete
	}: {
		paydaySettings: PaydaySettings | null | undefined;
		onEdit: () => void;
		onDelete: () => void;
	} = $props();
</script>

<div class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Payday Schedule</h2>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
			Configure your payday schedule to see how much is due before your next paycheck
		</p>
	</div>

	<div class="p-6">
		{#if paydaySettings}
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
				<div class="flex items-start justify-between">
					<div>
						<p class="text-sm font-medium text-gray-700 dark:text-gray-300">Current Schedule</p>
						<p class="mt-1 text-lg text-gray-900 dark:text-gray-100">
							{#if paydaySettings.frequency === 'weekly'}
								Every {[
									'Sunday',
									'Monday',
									'Tuesday',
									'Wednesday',
									'Thursday',
									'Friday',
									'Saturday'
								][paydaySettings.dayOfWeek ?? 0]}
							{:else if paydaySettings.frequency === 'biweekly'}
								Every other {[
									'Sunday',
									'Monday',
									'Tuesday',
									'Wednesday',
									'Thursday',
									'Friday',
									'Saturday'
								][paydaySettings.dayOfWeek ?? 0]}
							{:else if paydaySettings.frequency === 'semi-monthly'}
								{paydaySettings.dayOfMonth}{paydaySettings.dayOfMonth === 1
									? 'st'
									: paydaySettings.dayOfMonth === 2
										? 'nd'
										: paydaySettings.dayOfMonth === 3
											? 'rd'
											: 'th'} and {paydaySettings.dayOfMonth2}{paydaySettings.dayOfMonth2 === 1
									? 'st'
									: paydaySettings.dayOfMonth2 === 2
										? 'nd'
										: paydaySettings.dayOfMonth2 === 3
											? 'rd'
											: 'th'} of each month
							{:else if paydaySettings.frequency === 'monthly'}
								{paydaySettings.dayOfMonth}{paydaySettings.dayOfMonth === 1
									? 'st'
									: paydaySettings.dayOfMonth === 2
										? 'nd'
										: paydaySettings.dayOfMonth === 3
											? 'rd'
											: 'th'} of each month
							{/if}
						</p>
					</div>
					<div class="flex gap-2">
						<Button variant="primary" size="sm" onclick={onEdit}>
							Edit
						</Button>
						<Button variant="danger" size="sm" onclick={onDelete}>
							Remove
						</Button>
					</div>
				</div>
			</div>
		{:else}
			<div class="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center dark:border-gray-600">
				<svg
					class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No payday schedule set</h3>
				<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
					Set up your payday schedule to see bills due before your next paycheck
				</p>
				<Button variant="primary" size="md" onclick={onEdit} class="mt-4">
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Set Payday Schedule
				</Button>
			</div>
		{/if}
	</div>
</div>
