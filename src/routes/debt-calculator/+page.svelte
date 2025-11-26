<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import DebtCard from '$lib/components/DebtCard.svelte';
	import DebtForm from '$lib/components/DebtForm.svelte';
	import Modal from '$lib/components/Modal.svelte';
	import StrategySelector from '$lib/components/StrategySelector.svelte';
	import PayoffTimeline from '$lib/components/PayoffTimeline.svelte';
	import StrategyComparison from '$lib/components/StrategyComparison.svelte';
	import Button from '$lib/components/Button.svelte';
	import type { PageData } from './$types';
	import type { DebtWithDetails } from '$lib/types/debt';
	import type { StrategyComparison as ComparisonType } from '$lib/types/debt';

	let { data }: { data: PageData } = $props();

	// State
	let activeTab = $state<'debts' | 'strategy' | 'timeline' | 'compare'>('debts');
	let isFormOpen = $state(false);
	let editingDebt = $state<DebtWithDetails | null>(null);

	// Strategy state
	let selectedStrategy = $state<'snowball' | 'avalanche' | 'custom'>(
		data.strategySettings.strategy
	);
	let extraPayment = $state(data.strategySettings.extraMonthlyPayment);
	let customOrder = $state<number[]>(data.strategySettings.customPriorityOrder || []);

	// Calculations state
	let isCalculating = $state(false);
	let calculations = $state<
		| {
				comparison: ComparisonType;
				recommended: { strategy: string; reason: string };
		  }
		| null
	>(null);

	// Computed
	const hasDebts = $derived(data.debts.length > 0);
	const totalBalance = $derived(data.debts.reduce((sum, d) => sum + d.currentBalance, 0));
	const totalMinimum = $derived(data.debts.reduce((sum, d) => sum + d.minimumPayment, 0));

	// Modal handlers
	function openAddDebt() {
		editingDebt = null;
		isFormOpen = true;
	}

	function openEditDebt(debt: DebtWithDetails) {
		editingDebt = debt;
		isFormOpen = true;
	}

	function closeForm() {
		isFormOpen = false;
		editingDebt = null;
	}

	// CRUD operations
	async function handleSaveDebt(formData: any) {
		try {
			const method = editingDebt ? 'PATCH' : 'POST';
			const url = editingDebt ? `/api/debts/${editingDebt.id}` : '/api/debts';

			const response = await fetch(url, {
				method,
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(formData)
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to save debt');
			}

			await invalidateAll();
			closeForm();
		} catch (error) {
			alert(error instanceof Error ? error.message : 'Failed to save debt');
		}
	}

	async function handleDeleteDebt(debt: DebtWithDetails) {
		if (!confirm(`Are you sure you want to delete "${debt.name}"? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/debts/${debt.id}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to delete debt');
			}

			await invalidateAll();
		} catch (error) {
			alert('Failed to delete debt');
		}
	}

	// Strategy operations
	async function handleStrategyChange(strategy: 'snowball' | 'avalanche' | 'custom') {
		selectedStrategy = strategy;
		await saveStrategy();
	}

	async function handleExtraPaymentChange(amount: number) {
		extraPayment = amount;
		await saveStrategy();
	}

	async function handleCustomOrderChange(order: number[]) {
		customOrder = order;
		await saveStrategy();
	}

	async function saveStrategy() {
		try {
			await fetch('/api/debt-strategy', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					strategy: selectedStrategy,
					extraMonthlyPayment: extraPayment,
					customPriorityOrder: selectedStrategy === 'custom' ? customOrder : null
				})
			});
		} catch (error) {
			console.error('Failed to save strategy:', error);
		}
	}

	// Calculate payoff schedules
	async function calculatePayoff() {
		if (!hasDebts) return;

		isCalculating = true;
		try {
			const response = await fetch('/api/debt-calculator/calculate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					debts: data.debts,
					strategy: selectedStrategy,
					extraMonthlyPayment: extraPayment,
					customPriorityOrder: selectedStrategy === 'custom' ? customOrder : null
				})
			});

			if (!response.ok) {
				throw new Error('Failed to calculate payoff');
			}

			calculations = await response.json();
		} catch (error) {
			alert('Failed to calculate payoff schedules');
		} finally {
			isCalculating = false;
		}
	}

	// Auto-calculate when switching to timeline or compare tabs
	$effect(() => {
		if ((activeTab === 'timeline' || activeTab === 'compare') && hasDebts && !calculations) {
			calculatePayoff();
		}
	});

	// Auto-calculate when strategy settings change
	$effect(() => {
		// Track dependencies: selectedStrategy, extraPayment, customOrder, data.debts.length
		selectedStrategy;
		extraPayment;
		customOrder;
		data.debts.length;

		// Only recalculate if we have debts
		if (hasDebts) {
			calculatePayoff();
		}
	});

	// Get current strategy schedule for timeline
	const currentSchedule = $derived(() => {
		if (!calculations) return null;

		switch (selectedStrategy) {
			case 'snowball':
				return calculations.comparison.snowball;
			case 'avalanche':
				return calculations.comparison.avalanche;
			case 'custom':
				return calculations.comparison.custom || calculations.comparison.snowball;
			default:
				return calculations.comparison.snowball;
		}
	});

	// Get payoff dates for each debt based on current strategy
	const debtPayoffDates = $derived(() => {
		const schedule = currentSchedule();
		if (!schedule) return new Map<number, Date>();

		const payoffDates = new Map<number, Date>();

		// Go through timeline and find when each debt reaches $0 balance
		for (const month of schedule.timeline) {
			for (const debt of month.debts) {
				// If this debt reaches 0 and we haven't recorded its payoff date yet
				if (debt.remainingBalance === 0 && !payoffDates.has(debt.debtId)) {
					// Ensure date is a Date object (convert from string if needed)
					const date = month.date instanceof Date ? month.date : new Date(month.date);
					payoffDates.set(debt.debtId, date);
				}
			}
		}

		return payoffDates;
	});

	// Sort debts by payoff date (earliest first)
	const sortedDebts = $derived(() => {
		const dates = debtPayoffDates();
		if (dates.size === 0) return data.debts;

		return [...data.debts].sort((a, b) => {
			const dateA = dates.get(a.id);
			const dateB = dates.get(b.id);

			// If both have payoff dates, sort by date
			if (dateA && dateB) {
				return dateA.getTime() - dateB.getTime();
			}

			// Debts with payoff dates come before those without
			if (dateA && !dateB) return -1;
			if (!dateA && dateB) return 1;

			// If neither have payoff dates, maintain original order
			return 0;
		});
	});
</script>

<svelte:head>
	<title>Debt Calculator - Billzzz</title>
</svelte:head>

<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
	<!-- Page Header -->
	<div class="mb-8">
		<div>
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Debt Reduction Calculator</h1>
			<p class="mt-2 text-gray-600 dark:text-gray-400">
				Track your debts and calculate the fastest way to become debt-free
			</p>
		</div>

		{#if hasDebts}
			<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
				<div class="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
					<p class="text-sm text-blue-700 dark:text-blue-400 font-medium">Total Debt</p>
					<p class="text-2xl font-bold text-blue-900">${totalBalance.toFixed(2)}</p>
				</div>
				<div class="bg-purple-50 dark:bg-purple-950 p-4 rounded-lg">
					<p class="text-sm text-purple-700 dark:text-purple-400 font-medium">Monthly Minimums</p>
					<p class="text-2xl font-bold text-purple-900">${totalMinimum.toFixed(2)}</p>
				</div>
				<div class="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
					<p class="text-sm text-green-700 dark:text-green-400 font-medium">Extra Payment</p>
					<p class="text-2xl font-bold text-green-900">${extraPayment.toFixed(2)}</p>
				</div>
			</div>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="border-b border-gray-200 dark:border-gray-700 mb-6">
		<nav class="-mb-px flex space-x-8">
			<button
				onclick={() => (activeTab = 'debts')}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'debts'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				My Debts ({data.debts.length})
			</button>
			<button
				onclick={() => (activeTab = 'strategy')}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'strategy'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}"
			>
				Strategy
			</button>
			<button
				onclick={() => (activeTab = 'timeline')}
				disabled={!hasDebts}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'timeline'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Timeline
			</button>
			<button
				onclick={() => (activeTab = 'compare')}
				disabled={!hasDebts}
				class="py-4 px-1 border-b-2 font-medium text-sm {activeTab === 'compare'
					? 'border-blue-500 text-blue-600'
					: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} disabled:opacity-50 disabled:cursor-not-allowed"
			>
				Compare
			</button>
		</nav>
	</div>

	<!-- Tab Content -->
	<div>
		{#if activeTab === 'debts'}
			<div>
				<div class="flex justify-between items-center mb-6">
					<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Debts</h2>
					<Button onclick={openAddDebt}>
						Add Debt
					</Button>
				</div>

				{#if hasDebts}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each sortedDebts() as debt}
							<DebtCard
								{debt}
								payoffDate={debtPayoffDates().get(debt.id)}
								onEdit={openEditDebt}
								onDelete={handleDeleteDebt}
							/>
						{/each}
					</div>
				{:else}
					<div class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<svg
							class="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No debts yet</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by adding your first debt.</p>
						<div class="mt-6">
							<Button onclick={openAddDebt}>
								Add Your First Debt
							</Button>
						</div>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'strategy'}
			<div>
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Payoff Strategy</h2>

				{#if hasDebts}
					<StrategySelector
						debts={data.debts}
						selectedStrategy={selectedStrategy}
						extraPayment={extraPayment}
						customOrder={customOrder}
						onStrategyChange={handleStrategyChange}
						onExtraPaymentChange={handleExtraPaymentChange}
						onCustomOrderChange={handleCustomOrderChange}
					/>

					{#if isCalculating}
						<div class="mt-8 text-center">
							<div class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
								<svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span>Calculating payoff schedules...</span>
							</div>
						</div>
					{/if}
				{:else}
					<div class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<p class="text-gray-600 dark:text-gray-400">Add debts first to configure your payoff strategy.</p>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'timeline'}
			<div>
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Payoff Timeline</h2>

				{#if isCalculating}
					<div class="text-center py-12">
						<p class="text-gray-600 dark:text-gray-400">Calculating your payoff schedule...</p>
					</div>
				{:else if currentSchedule()}
					{@const schedule = currentSchedule()}
					{#if schedule}
						<PayoffTimeline {schedule} />
					{/if}
				{:else}
					<div class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<p class="text-gray-600 dark:text-gray-400">Configure your strategy to see results here.</p>
					</div>
				{/if}
			</div>
		{:else if activeTab === 'compare'}
			<div>
				<h2 class="text-xl font-semibold text-gray-900 mb-6">Strategy Comparison</h2>

				{#if isCalculating}
					<div class="text-center py-12">
						<p class="text-gray-600 dark:text-gray-400">Calculating comparison...</p>
					</div>
				{:else if calculations}
					<StrategyComparison
						comparison={calculations.comparison}
						recommended={calculations.recommended}
					/>
				{:else}
					<div class="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
						<p class="text-gray-600 dark:text-gray-400">Configure your strategy to see results here.</p>
					</div>
				{/if}
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
<Modal isOpen={isFormOpen} onClose={closeForm} title={editingDebt ? 'Edit Debt' : 'Add Debt'}>
	{#key editingDebt?.id ?? 'new'}
		<DebtForm
			bills={data.bills}
			initialData={editingDebt ? {
				name: editingDebt.name,
				originalBalance: editingDebt.originalBalance,
				currentBalance: editingDebt.currentBalance,
				interestRate: editingDebt.interestRate,
				minimumPayment: editingDebt.minimumPayment,
				linkedBillId: editingDebt.linkedBillId,
				priority: editingDebt.priority,
				notes: editingDebt.notes || undefined
			} : undefined}
			onSubmit={handleSaveDebt}
			onCancel={closeForm}
			submitLabel={editingDebt ? 'Update Debt' : 'Add Debt'}
		/>
	{/key}
</Modal>
