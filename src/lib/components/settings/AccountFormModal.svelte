<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';

	type AccountForm = {
		name: string;
		isExternal: boolean;
	};

	let {
		isOpen = $bindable(),
		mode,
		accountForm = $bindable(),
		onSubmit,
		onCancel
	}: {
		isOpen: boolean;
		mode: 'add' | 'edit';
		accountForm: AccountForm;
		onSubmit: () => void;
		onCancel: () => void;
	} = $props();

	const title = mode === 'add' ? 'Add New Account' : 'Edit Account';
	const submitLabel = mode === 'add' ? 'Add Account' : 'Update Account';
</script>

<Modal bind:isOpen onClose={onCancel} {title}>
	<form
		onsubmit={(e) => {
			e.preventDefault();
			onSubmit();
		}}
		class="space-y-4"
	>
		<div>
			<label
				for="{mode}-account-name"
				class="block text-sm font-medium text-gray-700 dark:text-gray-300"
			>
				Account Name
			</label>
			<input
				id="{mode}-account-name"
				type="text"
				bind:value={accountForm.name}
				required
				placeholder="e.g., Chase Checking, Savings Account"
				class="mt-1 block w-full rounded-md border border-gray-300 bg-white text-gray-900 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-500"
			/>
		</div>

		<div class="flex items-center gap-2">
			<input
				id="{mode}-account-external"
				type="checkbox"
				bind:checked={accountForm.isExternal}
				class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800"
			/>
			<label for="{mode}-account-external" class="text-sm text-gray-700 dark:text-gray-300">
				External account
			</label>
		</div>
		<p class="text-xs text-gray-500 dark:text-gray-400">
			Mark as external if this account belongs to someone else (e.g., friend, family member, business partner).
		</p>

		<div class="flex gap-3 pt-4">
			<Button type="submit" variant="primary" size="md" fullWidth={true}>
				{submitLabel}
			</Button>
			<Button variant="secondary" size="md" onclick={onCancel} fullWidth={true}>
				Cancel
			</Button>
		</div>
	</form>
</Modal>
