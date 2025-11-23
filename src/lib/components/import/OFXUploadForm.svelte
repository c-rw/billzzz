<script lang="ts">
	import Button from '$lib/components/Button.svelte';
	import { Upload } from 'lucide-svelte';
	import { enhance } from '$app/forms';

	let {
		uploading = $bindable(),
		selectedFile = $bindable()
	}: {
		uploading: boolean;
		selectedFile: File | null;
	} = $props();

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		}
	}
</script>

<div class="rounded-lg bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
	<div class="p-6">
		<h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Upload File</h2>

		<form
			method="POST"
			action="?/upload"
			enctype="multipart/form-data"
			use:enhance={() => {
				uploading = true;
				return async ({ update }) => {
					uploading = false;
					await update();
				};
			}}
		>
			<div class="space-y-4">
				<div>
					<label for="ofxFile" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
						Select OFX/QFX File
					</label>
					<div class="flex items-center gap-4">
						<input
							type="file"
							id="ofxFile"
							name="ofxFile"
							accept=".ofx,.qfx"
							onchange={handleFileChange}
							required
							class="block w-full text-sm text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500"
						/>
						<Button type="submit" variant="primary" size="md" disabled={uploading || !selectedFile}>
							{#if uploading}
								<span class="mr-2">Uploading...</span>
							{:else}
								<Upload class="mr-2 h-4 w-4" />
								Upload
							{/if}
						</Button>
					</div>
					{#if selectedFile}
						<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
							Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
						</p>
					{/if}
				</div>

				<div class="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
					<h3 class="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
						Supported File Formats
					</h3>
					<ul class="text-sm text-blue-800 dark:text-blue-200 space-y-1">
						<li>• OFX (Open Financial Exchange) - .ofx files</li>
						<li>• QFX (Quicken Financial Exchange) - .qfx files</li>
						<li>• Maximum file size: 10 MB</li>
					</ul>
				</div>
			</div>
		</form>
	</div>
</div>
