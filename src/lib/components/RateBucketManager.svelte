<script lang="ts">
	import type { DebtRateBucket } from '$lib/server/db/schema';
	import { format } from 'date-fns';

	let {
		debtId,
		debtBalance,
		rateBuckets = [],
		onUpdate
	}: {
		debtId: number;
		debtBalance: number;
		rateBuckets?: DebtRateBucket[];
		onUpdate: () => void;
	} = $props();

	let isAdding = $state(false);
	let editingId = $state<number | null>(null);

	// Form state
	let formData = $state({
		name: '',
		balance: 0,
		interestRate: 0,
		startDate: format(new Date(), 'yyyy-MM-dd'),
		expiresDate: '',
		isRetroactive: false,
		retroactiveRate: 0,
		category: 'purchase' as 'purchase' | 'balance-transfer' | 'cash-advance' | 'other'
	});

	const totalBucketBalance = $derived(
		rateBuckets.reduce((sum, b) => sum + b.balance, 0)
	);

	const remainingBalance = $derived(debtBalance - totalBucketBalance);

	function resetForm() {
		formData = {
			name: '',
			balance: 0,
			interestRate: 0,
			startDate: format(new Date(), 'yyyy-MM-dd'),
			expiresDate: '',
			isRetroactive: false,
			retroactiveRate: 0,
			category: 'purchase'
		};
		isAdding = false;
		editingId = null;
	}

	function startAdd() {
		resetForm();
		isAdding = true;
	}

	function startEdit(bucket: DebtRateBucket) {
		formData = {
			name: bucket.name,
			balance: bucket.balance,
			interestRate: bucket.interestRate,
			startDate: format(new Date(bucket.startDate), 'yyyy-MM-dd'),
			expiresDate: bucket.expiresDate ? format(new Date(bucket.expiresDate), 'yyyy-MM-dd') : '',
			isRetroactive: bucket.isRetroactive,
			retroactiveRate: bucket.retroactiveRate || 0,
			category: bucket.category
		};
		editingId = bucket.id;
		isAdding = true;
	}

	async function handleSubmit() {
		try {
			const url = editingId
				? `/api/debts/${debtId}/rate-buckets/${editingId}`
				: `/api/debts/${debtId}/rate-buckets`;

			const method = editingId ? 'PATCH' : 'POST';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					...formData,
					expiresDate: formData.expiresDate || null,
					retroactiveRate: formData.isRetroactive ? formData.retroactiveRate : null
				})
			});

			if (!response.ok) {
				const error = await response.json();
				alert(error.error || 'Failed to save rate bucket');
				return;
			}

			resetForm();
			onUpdate();
		} catch (error) {
			console.error('Error saving rate bucket:', error);
			alert('Failed to save rate bucket');
		}
	}

	async function handleDelete(bucketId: number) {
		if (!confirm('Are you sure you want to delete this rate bucket?')) {
			return;
		}

		try {
			const response = await fetch(`/api/debts/${debtId}/rate-buckets/${bucketId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				alert('Failed to delete rate bucket');
				return;
			}

			onUpdate();
		} catch (error) {
			console.error('Error deleting rate bucket:', error);
			alert('Failed to delete rate bucket');
		}
	}

	const categoryLabels = {
		purchase: 'Purchase',
		'balance-transfer': 'Balance Transfer',
		'cash-advance': 'Cash Advance',
		other: 'Other'
	};
</script>

<div class="space-y-4">
	<!-- Summary -->
	<div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
		<div>
			<p class="text-sm text-gray-600">Total Debt Balance</p>
			<p class="text-lg font-semibold">${debtBalance.toFixed(2)}</p>
		</div>
		<div>
			<p class="text-sm text-gray-600">Total in Buckets</p>
			<p class="text-lg font-semibold">${totalBucketBalance.toFixed(2)}</p>
		</div>
		<div>
			<p class="text-sm text-gray-600">Remaining (Regular Rate)</p>
			<p class="text-lg font-semibold">${remainingBalance.toFixed(2)}</p>
		</div>
	</div>

	<!-- Rate Buckets List -->
	{#if rateBuckets.length > 0}
		<div class="space-y-2">
			{#each rateBuckets as bucket (bucket.id)}
				<div class="border border-gray-200 rounded-lg p-4 bg-white">
					<div class="flex items-start justify-between">
						<div class="flex-1">
							<div class="flex items-center gap-2">
								<h4 class="font-medium text-gray-900">{bucket.name}</h4>
								<span
									class="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800"
								>
									{categoryLabels[bucket.category]}
								</span>
							</div>
							<div class="mt-2 grid grid-cols-2 gap-4 text-sm">
								<div>
									<p class="text-gray-500">Balance</p>
									<p class="font-semibold">${bucket.balance.toFixed(2)}</p>
								</div>
								<div>
									<p class="text-gray-500">APR</p>
									<p class="font-semibold">{bucket.interestRate}%</p>
								</div>
								<div>
									<p class="text-gray-500">Start Date</p>
									<p>{format(new Date(bucket.startDate), 'MMM d, yyyy')}</p>
								</div>
								<div>
									<p class="text-gray-500">Expires</p>
									<p>
										{bucket.expiresDate
											? format(new Date(bucket.expiresDate), 'MMM d, yyyy')
											: 'Never'}
									</p>
								</div>
							</div>
							{#if bucket.isRetroactive}
								<p class="mt-2 text-xs text-orange-600">
									⚠️ Retroactive interest penalty: {bucket.retroactiveRate}% if not paid by expiration
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<button
								onclick={() => startEdit(bucket)}
								class="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded"
							>
								Edit
							</button>
							<button
								onclick={() => handleDelete(bucket.id)}
								class="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
							>
								Delete
							</button>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{:else}
		<div class="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
			<p class="text-gray-500">No rate buckets configured. Using single rate for entire balance.</p>
		</div>
	{/if}

	<!-- Add/Edit Form -->
	{#if isAdding}
		<div class="border border-blue-200 rounded-lg p-4 bg-blue-50">
			<h4 class="font-medium text-gray-900 mb-4">
				{editingId ? 'Edit' : 'Add'} Rate Bucket
			</h4>
			<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-4">
				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="name" class="block text-sm font-medium text-gray-700">
							Name
						</label>
						<input
							id="name"
							type="text"
							bind:value={formData.name}
							required
							placeholder="e.g., Purchase 1, Balance Transfer"
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="category" class="block text-sm font-medium text-gray-700">
							Category
						</label>
						<select
							id="category"
							bind:value={formData.category}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						>
							<option value="purchase">Purchase</option>
							<option value="balance-transfer">Balance Transfer</option>
							<option value="cash-advance">Cash Advance</option>
							<option value="other">Other</option>
						</select>
					</div>

					<div>
						<label for="balance" class="block text-sm font-medium text-gray-700">
							Balance
						</label>
						<input
							id="balance"
							type="number"
							step="0.01"
							min="0"
							bind:value={formData.balance}
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="interestRate" class="block text-sm font-medium text-gray-700">
							APR (%)
						</label>
						<input
							id="interestRate"
							type="number"
							step="0.01"
							min="0"
							max="100"
							bind:value={formData.interestRate}
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="startDate" class="block text-sm font-medium text-gray-700">
							Start Date
						</label>
						<input
							id="startDate"
							type="date"
							bind:value={formData.startDate}
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label for="expiresDate" class="block text-sm font-medium text-gray-700">
							Expires Date (optional)
						</label>
						<input
							id="expiresDate"
							type="date"
							bind:value={formData.expiresDate}
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div class="flex items-start gap-2">
					<input
						id="isRetroactive"
						type="checkbox"
						bind:checked={formData.isRetroactive}
						class="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
					/>
					<div class="flex-1">
						<label for="isRetroactive" class="text-sm font-medium text-gray-700">
							Deferred/Retroactive Interest
						</label>
						<p class="text-xs text-gray-500">
							Check if unpaid balance will be charged retroactive interest from start date
						</p>
					</div>
				</div>

				{#if formData.isRetroactive}
					<div>
						<label for="retroactiveRate" class="block text-sm font-medium text-gray-700">
							Retroactive APR (%)
						</label>
						<input
							id="retroactiveRate"
							type="number"
							step="0.01"
							min="0"
							max="100"
							bind:value={formData.retroactiveRate}
							required
							class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
						/>
					</div>
				{/if}

				<div class="flex gap-3">
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
					>
						{editingId ? 'Update' : 'Add'} Bucket
					</button>
					<button
						type="button"
						onclick={resetForm}
						class="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
					>
						Cancel
					</button>
				</div>
			</form>
		</div>
	{:else}
		<button
			onclick={startAdd}
			class="w-full px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50"
		>
			+ Add Rate Bucket
		</button>
	{/if}
</div>
