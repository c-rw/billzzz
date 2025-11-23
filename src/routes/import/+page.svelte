<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import Button from '$lib/components/Button.svelte';
	import { enhance } from '$app/forms';
	import {
		Upload,
		ArrowLeft,
		Check,
		X,
		Plus,
		FileText,
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

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let uploading = $state(false);
	let processing = $state(false);
	let selectedFile = $state<File | null>(null);

	// Icon mapping for buckets
	const iconMap: Record<string, any> = {
		'shopping-cart': ShoppingCart,
		fuel: Fuel,
		utensils: Utensils,
		coffee: Coffee,
		popcorn: Popcorn,
		dumbbell: Dumbbell,
		gamepad: Gamepad2,
		smartphone: Smartphone,
		shirt: Shirt,
		home: Home,
		dog: Dog,
		heart: Heart
	};

	// Transaction mapping state
	let transactionMappings = $state<
		Array<{
			transactionId: number;
			action: 'map_existing' | 'create_new' | 'map_to_bucket' | 'create_new_bucket' | 'skip';
			billId?: number;
			billName?: string;
			amount: number;
			dueDate?: string;
			categoryId?: number;
			isRecurring?: boolean;
			recurrenceType?: string;
			bucketId?: number;
			bucketName?: string;
			budgetAmount?: number;
			frequency?: string;
			anchorDate?: string;
		}>
	>([]);

	// Initialize mappings when transactions load
	$effect(() => {
		if (data.transactions.length > 0 && transactionMappings.length === 0) {
			transactionMappings = data.transactions.map((t) => ({
				transactionId: t.transaction.id,
				action: 'skip' as const,
				amount: t.transaction.amount,
				billName: t.transaction.payee,
				dueDate: new Date(t.transaction.datePosted).toISOString().split('T')[0]
			}));
		}
	});

	function handleFileChange(event: Event) {
		const target = event.target as HTMLInputElement;
		if (target.files && target.files.length > 0) {
			selectedFile = target.files[0];
		}
	}

	function updateMapping(index: number, updates: Partial<(typeof transactionMappings)[number]>) {
		transactionMappings[index] = { ...transactionMappings[index], ...updates };
	}

	function selectAllUnmapped() {
		transactionMappings = transactionMappings.map((mapping) => {
			if (mapping.action === 'skip') {
				return { ...mapping, action: 'create_new' };
			}
			return mapping;
		});
	}

	function deselectAll() {
		transactionMappings = transactionMappings.map((mapping) => ({
			...mapping,
			action: 'skip'
		}));
	}
</script>

<svelte:head>
	<title>Import Transactions - Billzzz</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 py-8">
	<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900">Import Transactions</h1>
			<p class="mt-2 text-gray-600">Upload OFX or QFX files from your bank to import transactions</p>
		</div>

		{#if form?.error}
			<div class="mb-6 rounded-lg bg-red-50 border border-red-200 p-4">
				<p class="text-sm text-red-800">{form.error}</p>
			</div>
		{/if}

		{#if !data.sessionId}
			<!-- Upload Form -->
			<div class="rounded-lg bg-white shadow-sm border border-gray-200">
				<div class="p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Upload File</h2>

					<form method="POST" action="?/upload" enctype="multipart/form-data" use:enhance={() => {
						uploading = true;
						return async ({ update }) => {
							uploading = false;
							await update();
						};
					}}>
						<div class="space-y-4">
							<div>
								<label for="ofxFile" class="block text-sm font-medium text-gray-700 mb-2">
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
										class="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 focus:outline-none focus:border-blue-500"
									/>
									<Button
										type="submit"
										variant="primary"
										size="md"
										disabled={uploading || !selectedFile}
									>
										{#if uploading}
											<span class="mr-2">Uploading...</span>
										{:else}
											<Upload class="mr-2 h-4 w-4" />
											Upload
										{/if}
									</Button>
								</div>
								{#if selectedFile}
									<p class="mt-2 text-sm text-gray-600">
										Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
									</p>
								{/if}
							</div>

							<div class="rounded-lg bg-blue-50 border border-blue-200 p-4">
								<h3 class="text-sm font-medium text-blue-900 mb-2">Supported File Formats</h3>
								<ul class="text-sm text-blue-800 space-y-1">
									<li>• OFX (Open Financial Exchange) - .ofx files</li>
									<li>• QFX (Quicken Financial Exchange) - .qfx files</li>
									<li>• Maximum file size: 10 MB</li>
								</ul>
							</div>
						</div>
					</form>
				</div>
			</div>
		{:else}
			<!-- Review Transactions -->
			<div class="space-y-6">
				<div class="rounded-lg bg-white shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<div>
							<h2 class="text-lg font-semibold text-gray-900">
								Review Transactions ({data.transactions.length})
							</h2>
							<p class="text-sm text-gray-600">Map transactions to bills or create new bills</p>
							{#if data.session?.skippedCount && data.session.skippedCount > 0}
								<p class="text-sm text-amber-600 mt-1">
									{data.session.skippedCount} duplicate transaction{data.session.skippedCount > 1 ? 's' : ''} skipped (already imported)
								</p>
							{/if}
						</div>
						<div class="flex gap-2">
							<Button variant="secondary" size="sm" onclick={selectAllUnmapped}>
								Select All Unmapped
							</Button>
							<Button variant="secondary" size="sm" onclick={deselectAll}>
								Deselect All
							</Button>
						</div>
					</div>

					<form method="POST" action="?/processTransactions" use:enhance={() => {
						processing = true;
						return async ({ update }) => {
							processing = false;
							await update();
						};
					}}>
						<input type="hidden" name="sessionId" value={data.sessionId} />
						<input type="hidden" name="mappings" value={JSON.stringify(transactionMappings)} />

						<div class="space-y-4">
							{#each data.transactions as { transaction, bill, category }, index}
								<div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
									<div class="grid grid-cols-12 gap-4">
										<!-- Transaction Info -->
										<div class="col-span-12 md:col-span-4">
											<div class="flex items-start">
												<FileText class="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
												<div>
													<p class="font-medium text-gray-900">{transaction.payee}</p>
													<p class="text-sm text-gray-600">
														{new Date(transaction.datePosted).toLocaleDateString()}
													</p>
													{#if transaction.memo}
														<p class="text-xs text-gray-500 mt-1">{transaction.memo}</p>
													{/if}
													<p class="text-lg font-semibold text-gray-900 mt-1">
														${transaction.amount.toFixed(2)}
													</p>
												</div>
											</div>
										</div>

										<!-- Action Selection -->
										<div class="col-span-12 md:col-span-8">
											<div class="space-y-3">
												<!-- Action Type -->
												<div class="grid grid-cols-3 gap-2">
													<label class="flex items-center">
														<input
															type="radio"
															name="action_{index}"
															value="map_existing"
															checked={transactionMappings[index]?.action === 'map_existing'}
															onchange={() => updateMapping(index, { action: 'map_existing' })}
															class="mr-2"
														/>
														<span class="text-sm">Map to Bill</span>
													</label>
													<label class="flex items-center">
														<input
															type="radio"
															name="action_{index}"
															value="create_new"
															checked={transactionMappings[index]?.action === 'create_new'}
															onchange={() => updateMapping(index, { action: 'create_new' })}
															class="mr-2"
														/>
														<span class="text-sm">Create New Bill</span>
													</label>
													<label class="flex items-center">
														<input
															type="radio"
															name="action_{index}"
															value="skip"
															checked={transactionMappings[index]?.action === 'skip'}
															onchange={() => updateMapping(index, { action: 'skip' })}
															class="mr-2"
														/>
														<span class="text-sm">Skip</span>
													</label>
													<label class="flex items-center">
														<input
															type="radio"
															name="action_{index}"
															value="map_to_bucket"
															checked={transactionMappings[index]?.action === 'map_to_bucket'}
															onchange={() => updateMapping(index, { action: 'map_to_bucket' })}
															class="mr-2"
														/>
														<span class="text-sm">Map to Bucket</span>
													</label>
													<label class="flex items-center">
														<input
															type="radio"
															name="action_{index}"
															value="create_new_bucket"
															checked={transactionMappings[index]?.action === 'create_new_bucket'}
															onchange={() => updateMapping(index, { action: 'create_new_bucket', bucketName: transaction.payee, budgetAmount: transaction.amount, frequency: 'monthly', anchorDate: new Date(transaction.datePosted).toISOString().split('T')[0] })}
															class="mr-2"
														/>
														<span class="text-sm">Create New Bucket</span>
													</label>
												</div>

												<!-- Map to Existing Bill -->
												{#if transactionMappings[index]?.action === 'map_existing'}
													<select
														class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
														onchange={(e) =>
															updateMapping(index, {
																billId: parseInt((e.target as HTMLSelectElement).value)
															})}
													>
														<option value="">Select a bill...</option>
														{#each data.existingBills as existingBill}
															<option value={existingBill.id}>
																{existingBill.name} (${existingBill.amount.toFixed(2)})
															</option>
														{/each}
													</select>
												{/if}

												<!-- Map to Bucket -->
												{#if transactionMappings[index]?.action === 'map_to_bucket'}
													<select
														class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
														onchange={(e) =>
															updateMapping(index, {
																bucketId: parseInt((e.target as HTMLSelectElement).value)
															})}
													>
														<option value="">Select a bucket...</option>
														{#each data.buckets as bucket}
															{@const Icon = iconMap[bucket.icon || 'shopping-cart']}
															{@const remaining = bucket.currentCycle
																? bucket.currentCycle.budgetAmount +
																	bucket.currentCycle.carryoverAmount -
																	bucket.currentCycle.totalSpent
																: bucket.budgetAmount}
															<option value={bucket.id}>
																{bucket.name} (${remaining.toFixed(2)} available)
															</option>
														{/each}
													</select>
												{/if}

												<!-- Create New Bill -->
												{#if transactionMappings[index]?.action === 'create_new'}
													<div class="grid grid-cols-2 gap-3">
														<div>
															<label for="billName_{index}" class="block text-xs text-gray-600 mb-1"
																>Bill Name</label
															>
															<input
																id="billName_{index}"
																type="text"
																value={transactionMappings[index]?.billName || transaction.payee}
																onchange={(e) =>
																	updateMapping(index, {
																		billName: (e.target as HTMLInputElement).value
																	})}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
														<div>
															<label for="category_{index}" class="block text-xs text-gray-600 mb-1"
																>Category</label
															>
															<select
																id="category_{index}"
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
																onchange={(e) =>
																	updateMapping(index, {
																		categoryId: parseInt((e.target as HTMLSelectElement).value)
																	})}
															>
																<option value="">None</option>
																{#each data.categories as cat}
																	<option value={cat.id}>{cat.name}</option>
																{/each}
															</select>
														</div>
														<div>
															<label for="dueDate_{index}" class="block text-xs text-gray-600 mb-1"
																>Due Date</label
															>
															<input
																id="dueDate_{index}"
																type="date"
																value={transactionMappings[index]?.dueDate}
																onchange={(e) =>
																	updateMapping(index, {
																		dueDate: (e.target as HTMLInputElement).value
																	})}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
														<div>
															<label for="recurring_{index}" class="flex items-center text-xs text-gray-600 mt-4">
																<input
																	id="recurring_{index}"
																	type="checkbox"
																	checked={transactionMappings[index]?.isRecurring || false}
																	onchange={(e) =>
																		updateMapping(index, {
																			isRecurring: (e.target as HTMLInputElement).checked
																		})}
																	class="mr-2"
																/>
																Recurring Bill
															</label>
														</div>
													</div>
												{/if}

												<!-- Create New Bucket -->
												{#if transactionMappings[index]?.action === 'create_new_bucket'}
													<div class="grid grid-cols-2 gap-3">
														<div>
															<label for="bucketName_{index}" class="block text-xs text-gray-600 mb-1"
																>Bucket Name</label
															>
															<input
																id="bucketName_{index}"
																type="text"
																value={transactionMappings[index]?.bucketName || transaction.payee}
																onchange={(e) =>
																	updateMapping(index, {
																		bucketName: (e.target as HTMLInputElement).value
																	})}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
														<div>
															<label for="budgetAmount_{index}" class="block text-xs text-gray-600 mb-1"
																>Budget Amount</label
															>
															<input
																id="budgetAmount_{index}"
																type="number"
																step="0.01"
																value={transactionMappings[index]?.budgetAmount || transaction.amount}
																onchange={(e) =>
																	updateMapping(index, {
																		budgetAmount: parseFloat((e.target as HTMLInputElement).value)
																	})}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
														<div>
															<label for="frequency_{index}" class="block text-xs text-gray-600 mb-1"
																>Frequency</label
															>
															<select
																id="frequency_{index}"
																value={transactionMappings[index]?.frequency || 'monthly'}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
																onchange={(e) =>
																	updateMapping(index, {
																		frequency: (e.target as HTMLSelectElement).value
																	})}
															>
																<option value="weekly">Weekly</option>
																<option value="biweekly">Biweekly</option>
																<option value="monthly">Monthly</option>
																<option value="quarterly">Quarterly</option>
																<option value="yearly">Yearly</option>
															</select>
														</div>
														<div>
															<label for="anchorDate_{index}" class="block text-xs text-gray-600 mb-1"
																>Start Date</label
															>
															<input
																id="anchorDate_{index}"
																type="date"
																value={transactionMappings[index]?.anchorDate || new Date(transaction.datePosted).toISOString().split('T')[0]}
																onchange={(e) =>
																	updateMapping(index, {
																		anchorDate: (e.target as HTMLInputElement).value
																	})}
																class="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
															/>
														</div>
													</div>
												{/if}
											</div>
										</div>
									</div>
								</div>
							{/each}
						</div>

						<div class="mt-6 flex justify-end gap-3">
							<a
								href="/import"
								class="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
							>
								Cancel
							</a>
							<Button
								type="submit"
								variant="primary"
								size="md"
								disabled={processing}
							>
								{#if processing}
									Processing...
								{:else}
									Import {transactionMappings.filter((m) => m.action !== 'skip').length} Transactions
								{/if}
							</Button>
						</div>
					</form>
				</div>
			</div>
		{/if}
	</div>
</div>
