<script lang="ts">
	import Modal from '$lib/components/Modal.svelte';
	import Button from '$lib/components/Button.svelte';
	import { Upload, CheckCircle, AlertTriangle } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		accountName: string;
	}

	let { isOpen = $bindable(), onClose, accountName }: Props = $props();

	let uploading = $state(false);
	let selectedFile: File | null = $state(null);
	let result: { imported: number; skipped: number; total: number } | null = $state(null);
	let errorMessage: string | null = $state(null);

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
			// Reset previous results when selecting a new file
			result = null;
			errorMessage = null;
		}
	}

	function resetState() {
		selectedFile = null;
		result = null;
		errorMessage = null;
		uploading = false;
	}

	function handleClose() {
		resetState();
		onClose();
	}
</script>

{#if isOpen}
	<Modal bind:isOpen onClose={handleClose} title="Import Transactions">
		{#if result}
			<!-- Success state -->
			<div class="text-center py-4">
				<CheckCircle class="h-12 w-12 text-green-500 mx-auto mb-3" />
				<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
					Import Complete
				</h3>
				<p class="text-sm text-gray-600 dark:text-gray-400 mb-1">
					<span class="font-medium text-gray-900 dark:text-gray-100">{result.imported}</span> transaction{result.imported !== 1 ? 's' : ''} added to {accountName}
				</p>
				{#if result.skipped > 0}
					<p class="text-sm text-amber-600 dark:text-amber-400">
						{result.skipped} duplicate{result.skipped !== 1 ? 's' : ''} skipped (already imported)
					</p>
				{/if}
				<div class="mt-6">
					<Button variant="primary" size="md" onclick={handleClose}>
						Done
					</Button>
				</div>
			</div>
		{:else}
			<!-- Upload form -->
			<p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
				Import transactions from an OFX/QFX file into <span class="font-medium text-gray-900 dark:text-gray-100">{accountName}</span>.
			</p>

			{#if errorMessage}
				<div class="mb-4 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
					<div class="flex items-start gap-2">
						<AlertTriangle class="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
						<p class="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
					</div>
				</div>
			{/if}

			<form
				method="POST"
				action="?/importTransactions"
				enctype="multipart/form-data"
				use:enhance={() => {
					uploading = true;
					errorMessage = null;
					return async ({ result: formResult, update }) => {
						uploading = false;
						if (formResult.type === 'success' && formResult.data) {
							const data = formResult.data as any;
							result = {
								imported: data.importedCount ?? 0,
								skipped: data.skippedCount ?? 0,
								total: data.totalCount ?? 0
							};
							// Trigger a page data reload so the transaction list updates
							await update({ reset: false });
						} else if (formResult.type === 'failure' && formResult.data) {
							errorMessage = (formResult.data as any).error ?? 'Import failed';
						} else {
							errorMessage = 'An unexpected error occurred';
						}
					};
				}}
			>
				<div class="space-y-4">
					<div>
						<label for="importFile" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
							Select OFX/QFX File
						</label>
						<input
							type="file"
							id="importFile"
							name="ofxFile"
							accept=".ofx,.qfx"
							onchange={handleFileChange}
							required
							class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-950 dark:file:text-blue-400 dark:hover:file:bg-blue-900"
						/>
						{#if selectedFile}
							<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
								{selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
							</p>
						{/if}
					</div>

					<div class="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3">
						<p class="text-xs text-blue-800 dark:text-blue-200">
							Supports OFX (.ofx) and QFX (.qfx) files up to 10 MB. Duplicate transactions are automatically skipped.
						</p>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<Button variant="ghost" size="md" onclick={handleClose} disabled={uploading}>
						Cancel
					</Button>
					<Button type="submit" variant="primary" size="md" disabled={uploading || !selectedFile}>
						{#if uploading}
							Importing...
						{:else}
							<Upload class="mr-2 h-4 w-4" />
							Import
						{/if}
					</Button>
				</div>
			</form>
		{/if}
	</Modal>
{/if}
