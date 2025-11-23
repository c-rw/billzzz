<script lang="ts">
	import type { PageData } from './$types';
	import BillForm from '$lib/components/BillForm.svelte';
	import { goto } from '$app/navigation';

	let { data }: { data: PageData } = $props();

	async function handleSubmit(billData: any) {
		const response = await fetch('/api/bills', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(billData)
		});

		if (response.ok) {
			goto('/');
		} else {
			alert('Failed to create bill. Please try again.');
		}
	}

	function handleCancel() {
		goto('/');
	}
</script>

<svelte:head>
	<title>Add New Bill - Billzzz</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
	<div class="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
		<div class="mb-6">
			<a href="/" class="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300">
				<svg
					class="mr-1 h-4 w-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M10 19l-7-7m0 0l7-7m-7 7h18"
					/>
				</svg>
				Back to Dashboard
			</a>
		</div>

		<div class="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
			<h1 class="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Add New Bill</h1>
			<BillForm categories={data.categories} onSubmit={handleSubmit} onCancel={handleCancel} />
		</div>
	</div>
</div>
