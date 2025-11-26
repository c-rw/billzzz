<script lang="ts">
	import { enhance } from '$app/forms';
	import { createEventDispatcher } from 'svelte';
	import Button from './Button.svelte';

	let {
		currentBalance,
		expectedIncome
	}: {
		currentBalance: number | null;
		expectedIncome: number | null;
	} = $props();

	let balanceValue = $state(currentBalance?.toString() ?? '');
	let incomeValue = $state(expectedIncome?.toString() ?? '');
	let isSubmitting = $state(false);
	let showForm = $state(currentBalance === null || expectedIncome === null);

	const dispatch = createEventDispatcher();

	function toggleForm() {
		showForm = !showForm;
	}
</script>

<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
	<div class="flex items-center justify-between mb-4">
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">
			Financial Settings
		</h3>
		{#if !showForm}
			<Button variant="ghost" size="sm" onclick={toggleForm}>
				Edit
			</Button>
		{/if}
	</div>

	{#if showForm}
		<form
			method="POST"
			action="?/updatePreferences"
			use:enhance={() => {
				isSubmitting = true;
				return async ({ update }) => {
					await update();
					isSubmitting = false;
					showForm = false;
					dispatch('updated');
				};
			}}
		>
			<div class="grid gap-4 md:grid-cols-2">
				<div>
					<label
						for="currentBalance"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Current Account Balance
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
						<input
							type="number"
							id="currentBalance"
							name="currentBalance"
							bind:value={balanceValue}
							step="0.01"
							placeholder="0.00"
							class="pl-7 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
							required
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Your current checking/savings balance
					</p>
				</div>

				<div>
					<label
						for="expectedIncome"
						class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
					>
						Expected Income Per Paycheck
					</label>
					<div class="relative">
						<span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">$</span>
						<input
							type="number"
							id="expectedIncome"
							name="expectedIncomeAmount"
							bind:value={incomeValue}
							step="0.01"
							placeholder="0.00"
							class="pl-7 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 focus:border-blue-500 focus:ring-blue-500"
							required
						/>
					</div>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						Typical take-home pay per paycheck
					</p>
				</div>
			</div>

			<div class="mt-4 flex gap-3">
				<Button type="submit" variant="primary" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Save Settings'}
				</Button>
				{#if currentBalance !== null && expectedIncome !== null}
					<Button type="button" variant="ghost" onclick={toggleForm}>
						Cancel
					</Button>
				{/if}
			</div>
		</form>
	{:else}
		<div class="grid gap-4 md:grid-cols-2">
			<div>
				<p class="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
					${currentBalance?.toFixed(2) ?? '0.00'}
				</p>
			</div>
			<div>
				<p class="text-sm text-gray-500 dark:text-gray-400">Expected Income</p>
				<p class="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">
					${expectedIncome?.toFixed(2) ?? '0.00'}
				</p>
			</div>
		</div>
	{/if}
</div>
