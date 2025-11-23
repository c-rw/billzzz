<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import type { PaydaySettings } from '$lib/server/db/schema';
	import { format } from 'date-fns';

	interface Props {
		initialData?: PaydaySettings | null;
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
	}

	let { initialData, onSubmit, onCancel }: Props = $props();

	type FrequencyType = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly';

	let frequency = $state<FrequencyType>((initialData?.frequency as FrequencyType) || 'biweekly');
	let dayOfWeek = $state(initialData?.dayOfWeek ?? 5); // Default to Friday
	let dayOfMonth = $state(initialData?.dayOfMonth ?? 1);
	let dayOfMonth2 = $state(initialData?.dayOfMonth2 ?? 15);
	let startDate = $state(
		initialData?.startDate ? format(initialData.startDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd')
	);
	let isSubmitting = $state(false);

	const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			const [year, month, day] = startDate.split('-').map(Number);
			// Set time to noon to avoid timezone issues when serializing
			const localStartDate = new Date(year, month - 1, day, 12, 0, 0);

			await onSubmit({
				frequency,
				dayOfWeek: frequency === 'weekly' || frequency === 'biweekly' ? dayOfWeek : null,
				dayOfMonth: frequency === 'monthly' || frequency === 'semi-monthly' ? dayOfMonth : null,
				dayOfMonth2: frequency === 'semi-monthly' ? dayOfMonth2 : null,
				startDate: frequency === 'biweekly' ? localStartDate : null
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6">
	<!-- Frequency -->
	<div>
		<label for="frequency" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			How often do you get paid? <span class="text-red-500 dark:text-red-400">*</span>
		</label>
		<select
			id="frequency"
			bind:value={frequency}
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		>
			<option value="weekly">Weekly</option>
			<option value="biweekly">Every 2 Weeks (Biweekly)</option>
			<option value="semi-monthly">Twice a Month (Semi-Monthly)</option>
			<option value="monthly">Monthly</option>
		</select>
	</div>

	<!-- Weekly/Biweekly: Day of Week -->
	{#if frequency === 'weekly' || frequency === 'biweekly'}
		<div>
			<label for="dayOfWeek" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				What day of the week? <span class="text-red-500 dark:text-red-400">*</span>
			</label>
			<select
				id="dayOfWeek"
				bind:value={dayOfWeek}
				class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
			>
				{#each dayNames as dayName, index}
					<option value={index}>{dayName}</option>
				{/each}
			</select>
		</div>
	{/if}

	<!-- Biweekly: Start Date -->
	{#if frequency === 'biweekly'}
		<div>
			<label for="startDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				Next Payday <span class="text-red-500 dark:text-red-400">*</span>
			</label>
			<input
				type="date"
				id="startDate"
				bind:value={startDate}
				required
				class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				Enter your next payday so we can calculate the biweekly schedule
			</p>
		</div>
	{/if}

	<!-- Monthly: Day of Month -->
	{#if frequency === 'monthly'}
		<div>
			<label for="dayOfMonth" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
				What day of the month? <span class="text-red-500 dark:text-red-400">*</span>
			</label>
			<input
				type="number"
				id="dayOfMonth"
				bind:value={dayOfMonth}
				min="1"
				max="31"
				required
				class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			/>
			<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
				e.g., 15 for the 15th of each month
			</p>
		</div>
	{/if}

	<!-- Semi-Monthly: Two Days -->
	{#if frequency === 'semi-monthly'}
		<div class="grid grid-cols-2 gap-4">
			<div>
				<label for="dayOfMonth" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					First Payday <span class="text-red-500 dark:text-red-400">*</span>
				</label>
				<input
					type="number"
					id="dayOfMonth"
					bind:value={dayOfMonth}
					min="1"
					max="31"
					required
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>
			<div>
				<label for="dayOfMonth2" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
					Second Payday <span class="text-red-500 dark:text-red-400">*</span>
				</label>
				<input
					type="number"
					id="dayOfMonth2"
					bind:value={dayOfMonth2}
					min="1"
					max="31"
					required
					class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				/>
			</div>
		</div>
		<p class="text-xs text-gray-500 dark:text-gray-400">
			e.g., 1 and 15 for the 1st and 15th of each month
		</p>
	{/if}

	<!-- Actions -->
	<div class="flex items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-700">
		<Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : 'Save Payday Schedule'}
		</Button>
	</div>
</form>
