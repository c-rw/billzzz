<script lang="ts">
	import type { PageData } from './$types';
	import BillCard from '$lib/components/BillCard.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import BillForm from '$lib/components/BillForm.svelte';
	import PaymentModal from '$lib/components/PaymentModal.svelte';
	import type { BillWithCategory } from '$lib/types/bill';
	import { invalidateAll } from '$app/navigation';
	import { format } from 'date-fns';

	let { data }: { data: PageData } = $props();

	let filterStatus = $state<string>('all');
	let filterCategory = $state<number | null | 'uncategorized'>(null);
	let searchQuery = $state('');
	let sortField = $state<'dueDate' | 'amount' | 'name'>('dueDate');
	let sortDirection = $state<'asc' | 'desc'>('asc');
	let showAddModal = $state(false);
	let showEditModal = $state(false);
	let showPaymentModal = $state(false);
	let editingBillId = $state<number | null>(null);
	let payingBillId = $state<number | null>(null);

	const editingBill = $derived(
		editingBillId !== null ? data.bills.find((b) => b.id === editingBillId) : null
	);

	const payingBill = $derived(
		payingBillId !== null ? data.bills.find((b) => b.id === payingBillId) : null
	);

	const filteredBills = $derived.by(() => {
		let bills = data.bills as BillWithCategory[];

		// Apply status filter
		if (filterStatus !== 'all') {
			const now = new Date();
			bills = bills.filter((bill) => {
				if (filterStatus === 'paid') return bill.isPaid;
				if (filterStatus === 'unpaid') return !bill.isPaid;
				if (filterStatus === 'overdue') return !bill.isPaid && bill.dueDate <= now;
				if (filterStatus === 'upcoming') {
					const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
					return !bill.isPaid && bill.dueDate > now && bill.dueDate <= sevenDaysFromNow;
				}
				return true;
			});
		}

		// Apply category filter
		if (filterCategory !== null) {
			if (filterCategory === 'uncategorized') {
				bills = bills.filter((bill) => bill.categoryId === null);
			} else {
				bills = bills.filter((bill) => bill.categoryId === filterCategory);
			}
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			bills = bills.filter(
				(bill) =>
					bill.name.toLowerCase().includes(query) ||
					bill.notes?.toLowerCase().includes(query)
			);
		}

		// Apply sorting
		bills = [...bills].sort((a, b) => {
			let aVal, bVal;

			if (sortField === 'dueDate') {
				aVal = a.dueDate.getTime();
				bVal = b.dueDate.getTime();
			} else if (sortField === 'amount') {
				aVal = a.amount;
				bVal = b.amount;
			} else {
				aVal = a.name.toLowerCase();
				bVal = b.name.toLowerCase();
			}

			if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
			if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
			return 0;
		});

		return bills;
	});

	async function handleTogglePaid(id: number, isPaid: boolean) {
		if (isPaid) {
			// If marking as paid, show the payment modal
			payingBillId = id;
			showPaymentModal = true;
		} else {
			// If marking as unpaid, do it directly
			try {
				const response = await fetch(`/api/bills/${id}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ isPaid })
				});

				if (response.ok) {
					await invalidateAll();
				}
			} catch (error) {
				console.error('Error toggling bill status:', error);
			}
		}
	}

	async function handleConfirmPayment(amount: number) {
		if (payingBillId === null) return;

		try {
			const response = await fetch(`/api/bills/${payingBillId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isPaid: true, paymentAmount: amount })
			});

			if (response.ok) {
				showPaymentModal = false;
				payingBillId = null;
				await invalidateAll();
			} else {
				alert('Failed to record payment. Please try again.');
			}
		} catch (error) {
			console.error('Error recording payment:', error);
			alert('Failed to record payment. Please try again.');
		}
	}

	function handleCancelPayment() {
		showPaymentModal = false;
		payingBillId = null;
	}

	async function handleDelete(id: number) {
		try {
			const response = await fetch(`/api/bills/${id}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				await invalidateAll();
			}
		} catch (error) {
			console.error('Error deleting bill:', error);
		}
	}

	function resetFilters() {
		filterStatus = 'all';
		filterCategory = null;
		searchQuery = '';
	}

	async function handleAddBill(billData: any) {
		try {
			const response = await fetch('/api/bills', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(billData)
			});

			if (response.ok) {
				showAddModal = false;
				await invalidateAll();
			} else {
				alert('Failed to create bill. Please try again.');
			}
		} catch (error) {
			console.error('Error creating bill:', error);
			alert('Failed to create bill. Please try again.');
		}
	}

	function handleCloseModal() {
		showAddModal = false;
	}

	function handleEdit(id: number) {
		editingBillId = id;
		showEditModal = true;
	}

	async function handleUpdateBill(billData: any) {
		if (editingBillId === null) return;

		try {
			const response = await fetch(`/api/bills/${editingBillId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(billData)
			});

			if (response.ok) {
				showEditModal = false;
				editingBillId = null;
				await invalidateAll();
			} else {
				alert('Failed to update bill. Please try again.');
			}
		} catch (error) {
			console.error('Error updating bill:', error);
			alert('Failed to update bill. Please try again.');
		}
	}

	function handleCloseEditModal() {
		showEditModal = false;
		editingBillId = null;
	}
</script>

<svelte:head>
	<title>Billzzz - I Got Bills, They're Multiplying</title>
</svelte:head>

<div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
	<div class="mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900">Bills Dashboard</h1>
			<p class="mt-2 text-gray-600 italic">I got bills, they're multiplying</p>
		</div>
	</div>

		<!-- Stats Dashboard -->
		<div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Total Bills</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900">{data.stats.totalBills}</p>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Unpaid</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900">{data.stats.unpaidBills}</p>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Overdue</p>
				<p class="mt-1 text-2xl font-semibold text-red-600">{data.stats.overdueBills}</p>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Upcoming</p>
				<p class="mt-1 text-2xl font-semibold text-yellow-600">{data.stats.upcomingBills}</p>
			</div>
			<div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
				<p class="text-sm text-gray-500">Due Next 30 Days</p>
				<p class="mt-1 text-2xl font-semibold text-gray-900">
					${data.stats.totalAmount.toFixed(2)}
				</p>
			</div>
		</div>

		<!-- Payday Info (if configured) -->
		{#if data.stats.hasPaydayConfigured && data.stats.nextPayday}
			<div class="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 shadow-sm">
				<div class="flex items-start justify-between">
					<div class="flex-1">
						<h3 class="text-lg font-semibold text-blue-900">Next Payday: {format(data.stats.nextPayday, 'MMM d, yyyy')}</h3>
						<div class="mt-4 grid gap-4 sm:grid-cols-2">
							<div>
								<p class="text-sm text-blue-700">Due Before Next Payday</p>
								<div class="mt-1 flex items-baseline gap-2">
									<p class="text-3xl font-bold text-blue-900">
										${data.stats.amountDueBeforeNextPayday.toFixed(2)}
									</p>
									<p class="text-sm text-blue-600">({data.stats.dueBeforeNextPayday} bills)</p>
								</div>
							</div>
							{#if data.stats.followingPayday}
								<div>
									<p class="text-sm text-blue-700">Due Before Following Payday ({format(data.stats.followingPayday, 'MMM d')})</p>
									<div class="mt-1 flex items-baseline gap-2">
										<p class="text-3xl font-bold text-blue-900">
											${data.stats.amountDueBeforeFollowingPayday.toFixed(2)}
										</p>
										<p class="text-sm text-blue-600">({data.stats.dueBeforeFollowingPayday} bills)</p>
									</div>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Filters and Actions -->
		<div class="mb-6 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div class="flex flex-wrap items-center gap-3">
					<!-- Status Filter -->
					<select
						bind:value={filterStatus}
						class="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="all">All Bills</option>
						<option value="unpaid">Unpaid</option>
						<option value="paid">Paid</option>
						<option value="overdue">Overdue</option>
						<option value="upcoming">Upcoming</option>
					</select>

					<!-- Category Filter -->
					<select
						bind:value={filterCategory}
						class="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value={null}>All Categories</option>
						<option value="uncategorized">Uncategorized</option>
						{#each data.categories as category}
							<option value={category.id}>{category.icon} {category.name}</option>
						{/each}
					</select>

					<!-- Search -->
					<input
						type="text"
						bind:value={searchQuery}
						placeholder="Search bills..."
						class="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
					/>

					<!-- Sort -->
					<select
						bind:value={sortField}
						class="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
					>
						<option value="dueDate">Sort by Due Date</option>
						<option value="amount">Sort by Amount</option>
						<option value="name">Sort by Name</option>
					</select>

					<button
						onclick={() => (sortDirection = sortDirection === 'asc' ? 'desc' : 'asc')}
						class="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
						title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
					>
						{#if sortDirection === 'asc'}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
								/>
							</svg>
						{:else}
							<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4"
								/>
							</svg>
						{/if}
					</button>

					{#if filterStatus !== 'all' || filterCategory !== null || searchQuery}
						<button
							onclick={resetFilters}
							class="text-sm text-blue-600 hover:text-blue-700"
						>
							Reset filters
						</button>
					{/if}
				</div>

				<button
					onclick={() => (showAddModal = true)}
					class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
				>
					<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 4v16m8-8H4"
						/>
					</svg>
					Add Bill
				</button>
			</div>
		</div>

		<!-- Bills List -->
		{#if filteredBills.length === 0}
			<div class="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
				<svg
					class="mx-auto h-12 w-12 text-gray-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-2 text-sm font-semibold text-gray-900">No bills found</h3>
				<p class="mt-1 text-sm text-gray-500">Get started by adding your first bill.</p>
				<div class="mt-6">
					<button
						onclick={() => (showAddModal = true)}
						class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
					>
						<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 4v16m8-8H4"
							/>
						</svg>
						Add Bill
					</button>
				</div>
			</div>
		{:else}
			<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				{#each filteredBills as bill (bill.id)}
					<BillCard {bill} onTogglePaid={handleTogglePaid} onEdit={handleEdit} onDelete={handleDelete} />
				{/each}
			</div>

		<div class="mt-6 text-center text-sm text-gray-500">
			Showing {filteredBills.length} of {data.bills.length} bills
		</div>
	{/if}
</div>

<!-- Add Bill Modal -->
{#if showAddModal}
	<Modal bind:isOpen={showAddModal} onClose={handleCloseModal} title="Add New Bill">
		<BillForm
			categories={data.categories}
			onSubmit={handleAddBill}
			onCancel={handleCloseModal}
			submitLabel="Add Bill"
		/>
	</Modal>
{/if}

<!-- Edit Bill Modal -->
{#if editingBill}
	<Modal bind:isOpen={showEditModal} onClose={handleCloseEditModal} title="Edit Bill">
		<BillForm
			categories={data.categories}
			initialData={{
				name: editingBill.name,
				amount: editingBill.amount,
				dueDate: editingBill.dueDate,
				paymentLink: editingBill.paymentLink || undefined,
				categoryId: editingBill.categoryId,
				isRecurring: editingBill.isRecurring,
				recurrenceType: editingBill.recurrenceType || undefined,
				recurrenceDay: editingBill.recurrenceDay || undefined,
				isAutopay: editingBill.isAutopay,
				notes: editingBill.notes || undefined
			}}
			onSubmit={handleUpdateBill}
			onCancel={handleCloseEditModal}
			submitLabel="Update Bill"
		/>
	</Modal>
{/if}

<!-- Payment Confirmation Modal -->
{#if payingBill}
	<PaymentModal
		bind:isOpen={showPaymentModal}
		bill={payingBill}
		onConfirm={handleConfirmPayment}
		onCancel={handleCancelPayment}
	/>
{/if}
