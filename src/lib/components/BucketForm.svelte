<script lang="ts">
	import type { FrequencyType } from '$lib/types/bucket';
	import { format } from 'date-fns';

	interface Props {
		initialData?: {
			name?: string;
			frequency?: FrequencyType;
			budgetAmount?: number;
			enableCarryover?: boolean;
			icon?: string;
			color?: string;
			anchorDate?: Date;
		};
		onSubmit: (data: any) => Promise<void>;
		onCancel: () => void;
		submitLabel?: string;
	}

	let {
		initialData,
		onSubmit,
		onCancel,
		submitLabel = 'Save Bucket'
	}: Props = $props();

	let name = $state('');
	let frequency = $state<FrequencyType>('monthly');
	let budgetAmount = $state(0);
	let enableCarryover = $state(true);
	let icon = $state('');
	let color = $state('#3b82f6');
	let anchorDate = $state(format(new Date(), 'yyyy-MM-dd'));
	let isSubmitting = $state(false);

	// Preset icon options
	const iconOptions = [
		{ emoji: '🛒', label: 'Groceries' },
		{ emoji: '⛽', label: 'Petrol' },
		{ emoji: '🍔', label: 'Fast Food' },
		{ emoji: '☕', label: 'Coffee' },
		{ emoji: '🎬', label: 'Entertainment' },
		{ emoji: '🏋️', label: 'Fitness' },
		{ emoji: '🎮', label: 'Gaming' },
		{ emoji: '📱', label: 'Tech' },
		{ emoji: '👕', label: 'Clothing' },
		{ emoji: '🏠', label: 'Home' },
		{ emoji: '🐕', label: 'Pets' },
		{ emoji: '💊', label: 'Health' }
	];

	// Reset form when initialData changes
	$effect(() => {
		name = initialData?.name || '';
		frequency = initialData?.frequency || 'monthly';
		budgetAmount = initialData?.budgetAmount || 0;
		enableCarryover = initialData?.enableCarryover ?? true;
		icon = initialData?.icon || '';
		color = initialData?.color || '#3b82f6';
		anchorDate = initialData?.anchorDate
			? format(initialData.anchorDate, 'yyyy-MM-dd')
			: format(new Date(), 'yyyy-MM-dd');
	});

	async function handleSubmit(e: Event) {
		e.preventDefault();
		isSubmitting = true;

		try {
			// Parse date as local time to avoid timezone issues
			const [year, month, day] = anchorDate.split('-').map(Number);
			const localDate = new Date(year, month - 1, day);

			await onSubmit({
				name,
				frequency,
				budgetAmount: parseFloat(budgetAmount.toString()),
				enableCarryover,
				icon: icon || null,
				color: color || null,
				anchorDate: localDate
			});
		} finally {
			isSubmitting = false;
		}
	}
</script>

<form onsubmit={handleSubmit} class="space-y-4">
	<!-- Name -->
	<div>
		<label for="name" class="block text-sm font-medium text-gray-700">Bucket Name</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
			placeholder="e.g., Groceries, Petrol, Fast Food"
		/>
	</div>

	<!-- Icon Selection -->
	<div>
		<label class="block text-sm font-medium text-gray-700 mb-2">Icon (Optional)</label>
		<div class="grid grid-cols-6 gap-2">
			{#each iconOptions as option}
				<button
					type="button"
					onclick={() => (icon = option.emoji)}
					class="p-2 text-2xl rounded-md border-2 transition-all {icon === option.emoji
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-200 hover:border-gray-300'}"
					title={option.label}
				>
					{option.emoji}
				</button>
			{/each}
		</div>
		{#if icon}
			<button
				type="button"
				onclick={() => (icon = '')}
				class="mt-2 text-xs text-gray-500 hover:text-gray-700"
			>
				Clear selection
			</button>
		{/if}
	</div>

	<!-- Color -->
	<div>
		<label for="color" class="block text-sm font-medium text-gray-700">Color (Optional)</label>
		<div class="mt-1 flex items-center gap-2">
			<input
				type="color"
				id="color"
				bind:value={color}
				class="h-10 w-20 rounded-md border-gray-300"
			/>
			<span class="text-sm text-gray-500">{color}</span>
		</div>
	</div>

	<!-- Frequency -->
	<div>
		<label for="frequency" class="block text-sm font-medium text-gray-700">Frequency</label>
		<select
			id="frequency"
			bind:value={frequency}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		>
			<option value="weekly">Weekly</option>
			<option value="biweekly">Biweekly</option>
			<option value="monthly">Monthly</option>
			<option value="quarterly">Quarterly</option>
			<option value="yearly">Yearly</option>
		</select>
	</div>

	<!-- Budget Amount -->
	<div>
		<label for="amount" class="block text-sm font-medium text-gray-700">Budget Amount</label>
		<div class="mt-1 relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<span class="text-gray-500 sm:text-sm">$</span>
			</div>
			<input
				type="number"
				id="amount"
				bind:value={budgetAmount}
				required
				min="0"
				step="0.01"
				class="block w-full rounded-md border-gray-300 pl-7 focus:border-blue-500 focus:ring-blue-500"
				placeholder="0.00"
			/>
		</div>
	</div>

	<!-- Anchor Date -->
	<div>
		<label for="anchorDate" class="block text-sm font-medium text-gray-700">
			Start Date
		</label>
		<input
			type="date"
			id="anchorDate"
			bind:value={anchorDate}
			required
			class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
		/>
		<p class="mt-1 text-xs text-gray-500">
			This determines when your cycles start. For example, if you get paid on the 1st, set this to the 1st.
		</p>
	</div>

	<!-- Enable Carryover -->
	<div class="flex items-start">
		<div class="flex h-5 items-center">
			<input
				type="checkbox"
				id="carryover"
				bind:checked={enableCarryover}
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
			/>
		</div>
		<div class="ml-3">
			<label for="carryover" class="text-sm font-medium text-gray-700">Enable Carryover</label>
			<p class="text-xs text-gray-500">
				Carry unused budget (or overspending) to the next cycle
			</p>
		</div>
	</div>

	<!-- Form Actions -->
	<div class="flex justify-end gap-3 pt-4">
		<button
			type="button"
			onclick={onCancel}
			disabled={isSubmitting}
			class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
		>
			Cancel
		</button>
		<button
			type="submit"
			disabled={isSubmitting}
			class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
		>
			{isSubmitting ? 'Saving...' : submitLabel}
		</button>
	</div>
</form>
