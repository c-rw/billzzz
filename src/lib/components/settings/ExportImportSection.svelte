<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';

	let {
		onExport
	}: {
		onExport: () => void;
	} = $props();

	let importing = $state(false);
</script>

<div class="mb-8 rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-gray-800 dark:border-gray-700">
	<div class="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
		<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Backup & Restore</h2>
		<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
			Export all your data or import from a previous backup
		</p>
	</div>

	<div class="p-6">
		<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
			<!-- Export -->
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
				<div class="flex items-start gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900"
					>
						<svg
							class="h-5 w-5 text-blue-600 dark:text-blue-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Export Data</h3>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
							Download a JSON file with all your bills, buckets, debts, categories, and settings (payment history not included)
						</p>
						<Button variant="primary" size="md" onclick={onExport} class="mt-3">
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
								/>
							</svg>
							Export All Data
						</Button>
					</div>
				</div>
			</div>

			<!-- Import -->
			<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-600 dark:bg-gray-700">
				<div class="flex items-start gap-3">
					<div
						class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900"
					>
						<svg
							class="h-5 w-5 text-green-600 dark:text-green-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
							/>
						</svg>
					</div>
					<div class="flex-1">
						<h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Import Data</h3>
						<p class="mt-1 text-sm text-gray-600 dark:text-gray-300">Restore from a previously exported backup file</p>
						<form
							method="POST"
							action="?/importData"
							enctype="multipart/form-data"
							use:enhance={() => {
								if (
									!confirm(
										'WARNING: This will replace ALL your current data with the imported data. Are you sure you want to continue?'
									)
								) {
									return () => {};
								}
								importing = true;
								return async ({ result, update }) => {
									importing = false;
									if (result.type === 'success') {
										alert('Data imported successfully!');
									} else if (result.type === 'failure') {
										alert(`Import failed: ${result.data?.error || 'Unknown error'}`);
									}
									await update();
								};
							}}
						>
							<input
								type="file"
								name="file"
								accept=".json"
								required
								class="hidden"
								id="import-file-input"
								onchange={(e) => {
									const form = e.currentTarget.closest('form');
									if (form && e.currentTarget.files?.length) {
										form.requestSubmit();
									}
								}}
							/>
							<Button
								variant="primary"
								size="md"
								onclick={(e) => {
									const target = e.currentTarget as HTMLButtonElement;
									const input = target?.parentElement?.querySelector('#import-file-input');
									if (input) (input as HTMLInputElement).click();
								}}
								disabled={importing}
								class="mt-3 bg-green-600 hover:bg-green-700 focus:ring-green-500 dark:bg-green-700 dark:hover:bg-green-600"
							>
								{#if importing}
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
									Importing...
								{:else}
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
										/>
									</svg>
									Import from Backup
								{/if}
							</Button>
						</form>
					</div>
				</div>
			</div>
		</div>

		<div class="mt-4 rounded-lg bg-yellow-50 border border-yellow-200 p-4 dark:bg-yellow-900 dark:border-yellow-700">
			<div class="flex">
				<svg
					class="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0"
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
					<h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Important Notes</h3>
					<div class="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
						<ul class="list-disc pl-5 space-y-1">
							<li>Importing will <strong>replace all existing data</strong></li>
							<li>Make sure to export your current data before importing</li>
							<li>The import file must be a valid JSON backup file from Billzzz</li>
						</ul>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>
