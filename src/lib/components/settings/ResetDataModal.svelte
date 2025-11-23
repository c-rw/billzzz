<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';

	let {
		isOpen = $bindable(),
		onClose
	}: {
		isOpen: boolean;
		onClose: () => void;
	} = $props();

	let resetting = $state(false);
	let resetConfirmation = $state('');

	function handleClose() {
		resetConfirmation = '';
		onClose();
	}
</script>

<Modal bind:isOpen onClose={handleClose} title="Reset All Data">
	<form
		method="POST"
		action="?/resetData"
		use:enhance={() => {
			resetting = true;
			return async ({ result, update }) => {
				resetting = false;
				if (result.type === 'success') {
					handleClose();
					alert('All data has been deleted successfully!');
					await invalidateAll();
				} else if (result.type === 'failure') {
					alert(`Reset failed: ${result.data?.error || 'Unknown error'}`);
				}
				await update();
			};
		}}
		class="space-y-4"
	>
		<div class="rounded-lg bg-red-50 border border-red-200 p-4 dark:bg-red-900 dark:border-red-700">
			<div class="flex">
				<svg
					class="h-5 w-5 text-red-600 dark:text-red-400 shrink-0"
					fill="currentColor"
					viewBox="0 0 20 20"
				>
					<path
						fill-rule="evenodd"
						d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
						clip-rule="evenodd"
					/>
				</svg>
				<div class="ml-3">
					<h3 class="text-sm font-medium text-red-800 dark:text-red-200">Warning: This action is irreversible!</h3>
					<div class="mt-2 text-sm text-red-700 dark:text-red-300">
						<p>This will permanently delete:</p>
						<ul class="list-disc pl-5 mt-2 space-y-1">
							<li>All bills and payment history</li>
							<li>All buckets and transactions</li>
							<li>All debts and payments</li>
							<li>All categories</li>
							<li>All settings including payday schedule</li>
							<li>All import sessions and imported transactions</li>
						</ul>
						<p class="mt-3 font-semibold">
							Make sure to export your data first if you want to keep a backup!
						</p>
					</div>
				</div>
			</div>
		</div>

		<div>
			<label for="reset-confirmation" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
				To confirm, type <strong class="text-red-600 dark:text-red-400">DELETE ALL DATA</strong> below:
			</label>
			<input
				id="reset-confirmation"
				type="text"
				name="confirmation"
				bind:value={resetConfirmation}
				required
				placeholder="DELETE ALL DATA"
				class="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-400 dark:focus:border-red-400 dark:focus:ring-red-400"
			/>
		</div>

		<div class="flex gap-3 pt-4">
			<Button
				type="submit"
				variant="danger"
				size="md"
				disabled={resetting || resetConfirmation !== 'DELETE ALL DATA'}
				fullWidth={true}
			>
				{#if resetting}
					<span class="inline-flex items-center gap-2">
						<svg
							class="h-4 w-4 animate-spin"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Deleting...
					</span>
				{:else}
					Delete All Data
				{/if}
			</Button>
			<Button
				variant="secondary"
				size="md"
				onclick={handleClose}
				disabled={resetting}
				fullWidth={true}
			>
				Cancel
			</Button>
		</div>
	</form>
</Modal>
