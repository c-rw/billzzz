<script lang="ts">
	import type { FrequencyType } from '$lib/types/bucket';
	import { format } from 'date-fns';
	import Button from '$lib/components/Button.svelte';
	import {
		ShoppingCart,
		Fuel,
		Utensils,
		Coffee,
		Popcorn,
		Dumbbell,
		Gamepad2,
		Smartphone,
		Shirt,
		Home,
		Dog,
		Heart
	} from 'lucide-svelte';

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
	let iconSearchQuery = $state('');

	// Preset icon options
	const iconOptions = [
		{ id: 'shopping-cart', component: ShoppingCart, label: 'Groceries' },
		{ id: 'fuel', component: Fuel, label: 'Gas' },
		{ id: 'utensils', component: Utensils, label: 'Food' },
		{ id: 'coffee', component: Coffee, label: 'Coffee' },
		{ id: 'popcorn', component: Popcorn, label: 'Entertainment' },
		{ id: 'dumbbell', component: Dumbbell, label: 'Fitness' },
		{ id: 'gamepad', component: Gamepad2, label: 'Gaming' },
		{ id: 'smartphone', component: Smartphone, label: 'Tech' },
		{ id: 'shirt', component: Shirt, label: 'Clothing' },
		{ id: 'home', component: Home, label: 'Home' },
		{ id: 'dog', component: Dog, label: 'Pets' },
		{ id: 'heart', component: Heart, label: 'Health' }
	];

	// Filter icons based on search query
	const filteredIconOptions = $derived(
		iconSearchQuery.trim() === ''
			? iconOptions
			: iconOptions.filter(option =>
				option.label.toLowerCase().includes(iconSearchQuery.toLowerCase()) ||
				option.id.toLowerCase().includes(iconSearchQuery.toLowerCase())
			)
	);

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
		<label for="name" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Bucket Name</label>
		<input
			type="text"
			id="name"
			bind:value={name}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			placeholder="e.g., Groceries, Petrol, Fast Food"
		/>
	</div>

	<!-- Icon Selection -->
	<div>
		<div class="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Icon (Optional)</div>
		<input
			type="text"
			bind:value={iconSearchQuery}
			placeholder="Search icons..."
			class="mb-3 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
		/>
		<div class="grid grid-cols-6 gap-2">
			{#each filteredIconOptions as option}
				{@const IconComponent = option.component}
				<button
					type="button"
					onclick={() => (icon = option.id)}
					class="p-3 rounded-md border-2 transition-all {icon === option.id
						? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
						: 'border-gray-200 hover:border-gray-300 text-gray-600 dark:border-gray-700 dark:hover:border-gray-600 dark:text-gray-400'}"
					title={option.label}
				>
					<IconComponent size={24} />
				</button>
			{/each}
		</div>
		{#if filteredIconOptions.length === 0}
			<p class="mt-2 text-sm text-gray-500 text-center dark:text-gray-400">No icons found</p>
		{/if}
		{#if icon}
			<button
				type="button"
				onclick={() => (icon = '')}
				class="mt-2 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
			>
				Clear selection
			</button>
		{/if}
	</div>

	<!-- Color -->
	<div>
		<label for="color" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Color (Optional)</label>
		<div class="mt-1 flex items-center gap-2">
			<input
				type="color"
				id="color"
				bind:value={color}
				class="h-10 w-20 rounded-md border border-gray-300 dark:border-gray-600"
			/>
			<span class="text-sm text-gray-500 dark:text-gray-400">{color}</span>
		</div>
	</div>

	<!-- Frequency -->
	<div>
		<label for="frequency" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Frequency</label>
		<select
			id="frequency"
			bind:value={frequency}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
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
		<label for="amount" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Budget Amount</label>
		<div class="mt-1 relative rounded-md shadow-sm">
			<div class="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
				<span class="text-gray-500 sm:text-sm dark:text-gray-400">$</span>
			</div>
			<input
				type="number"
				id="amount"
				bind:value={budgetAmount}
				required
				min="0"
				step="0.01"
				class="block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 pl-7 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
				placeholder="0.00"
			/>
		</div>
	</div>

	<!-- Anchor Date -->
	<div>
		<label for="anchorDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
			Start Date
		</label>
		<input
			type="date"
			id="anchorDate"
			bind:value={anchorDate}
			required
			class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
		/>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
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
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600"
			/>
		</div>
		<div class="ml-3">
			<label for="carryover" class="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Carryover</label>
			<p class="text-xs text-gray-500 dark:text-gray-400">
				Carry unused budget (or overspending) to the next cycle
			</p>
		</div>
	</div>

	<!-- Form Actions -->
	<div class="flex justify-end gap-3 pt-4">
		<Button variant="secondary" onclick={onCancel} disabled={isSubmitting}>
			Cancel
		</Button>
		<Button type="submit" disabled={isSubmitting}>
			{isSubmitting ? 'Saving...' : submitLabel}
		</Button>
	</div>
</form>
