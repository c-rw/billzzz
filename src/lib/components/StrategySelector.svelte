<script lang="ts">
	import type { DebtWithDetails } from '$lib/types/debt';

	interface Props {
		debts: DebtWithDetails[];
		selectedStrategy: 'snowball' | 'avalanche' | 'custom';
		extraPayment: number;
		customOrder: number[];
		onStrategyChange: (strategy: 'snowball' | 'avalanche' | 'custom') => void;
		onExtraPaymentChange: (amount: number) => void;
		onCustomOrderChange: (order: number[]) => void;
	}

	let {
		debts,
		selectedStrategy,
		extraPayment,
		customOrder,
		onStrategyChange,
		onExtraPaymentChange,
		onCustomOrderChange
	}: Props = $props();

	let draggedIndex = $state<number | null>(null);

	// Sort debts for custom ordering display
	const orderedDebts = $derived(() => {
		if (selectedStrategy !== 'custom' || customOrder.length === 0) {
			return debts;
		}

		const ordered = [...debts].sort((a, b) => {
			const aIndex = customOrder.indexOf(a.id);
			const bIndex = customOrder.indexOf(b.id);
			if (aIndex === -1) return 1;
			if (bIndex === -1) return -1;
			return aIndex - bIndex;
		});

		return ordered;
	});

	function handleDragStart(index: number) {
		draggedIndex = index;
	}

	function handleDragOver(e: DragEvent, index: number) {
		e.preventDefault();
		if (draggedIndex === null || draggedIndex === index) return;

		const newOrder = [...orderedDebts()];
		const draggedItem = newOrder[draggedIndex];
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(index, 0, draggedItem);

		onCustomOrderChange(newOrder.map((d) => d.id));
		draggedIndex = index;
	}

	function handleDragEnd() {
		draggedIndex = null;
	}

	// Initialize custom order if not set
	$effect(() => {
		if (selectedStrategy === 'custom' && customOrder.length === 0 && debts.length > 0) {
			onCustomOrderChange(debts.map((d) => d.id));
		}
	});
</script>

<div class="space-y-6">
	<!-- Strategy Selection -->
	<div>
		<h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Choose Payoff Strategy</h3>

		<div class="space-y-3">
			<!-- Snowball -->
			<label
				class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors {selectedStrategy ===
				'snowball'
					? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
					: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
			>
				<input
					type="radio"
					name="strategy"
					value="snowball"
					checked={selectedStrategy === 'snowball'}
					onchange={() => onStrategyChange('snowball')}
					class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
				/>
				<div class="ml-3">
					<span class="block text-sm font-medium text-gray-900 dark:text-gray-100">Snowball Method</span>
					<span class="block text-sm text-gray-600 dark:text-gray-400 mt-1">
						Pay off smallest balance first for quick psychological wins. After each debt is paid
						off, roll that payment into the next smallest debt.
					</span>
				</div>
			</label>

			<!-- Avalanche -->
			<label
				class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors {selectedStrategy ===
				'avalanche'
					? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
					: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
			>
				<input
					type="radio"
					name="strategy"
					value="avalanche"
					checked={selectedStrategy === 'avalanche'}
					onchange={() => onStrategyChange('avalanche')}
					class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
				/>
				<div class="ml-3">
					<span class="block text-sm font-medium text-gray-900 dark:text-gray-100">Avalanche Method</span>
					<span class="block text-sm text-gray-600 dark:text-gray-400 mt-1">
						Pay off highest interest rate first to minimize total interest paid. Most
						mathematically efficient method.
					</span>
				</div>
			</label>

			<!-- Custom -->
			<label
				class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-colors {selectedStrategy ===
				'custom'
					? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-950'
					: 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}"
			>
				<input
					type="radio"
					name="strategy"
					value="custom"
					checked={selectedStrategy === 'custom'}
					onchange={() => onStrategyChange('custom')}
					class="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500"
				/>
				<div class="ml-3">
					<span class="block text-sm font-medium text-gray-900 dark:text-gray-100">Custom Priority</span>
					<span class="block text-sm text-gray-600 dark:text-gray-400 mt-1">
						Set your own payoff order. Drag and drop debts below to prioritize.
					</span>
				</div>
			</label>
		</div>
	</div>

	<!-- Extra Payment Amount -->
	<div>
		<label for="extraPayment" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
			Extra Monthly Payment
		</label>
		<div class="relative rounded-md shadow-sm">
			<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
				<span class="text-gray-500 dark:text-gray-400 sm:text-sm">$</span>
			</div>
			<input
				id="extraPayment"
				type="number"
				step="0.01"
				min="0"
				value={extraPayment}
				oninput={(e) => onExtraPaymentChange(parseFloat(e.currentTarget.value) || 0)}
				class="block w-full pl-7 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
			/>
		</div>
		<p class="mt-1 text-xs text-gray-500 dark:text-gray-400 dark:text-gray-500">
			Amount you can pay beyond minimum payments each month
		</p>
	</div>

	<!-- Custom Order Drag and Drop -->
	{#if selectedStrategy === 'custom'}
		<div>
			<h4 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
				Drag to Reorder (Top = Highest Priority)
			</h4>
			<div class="space-y-2">
				{#each orderedDebts() as debt, index}
					<div
						role="button"
						tabindex="0"
						draggable="true"
						ondragstart={() => handleDragStart(index)}
						ondragover={(e) => handleDragOver(e, index)}
						ondragend={handleDragEnd}
						class="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md cursor-move hover:border-blue-400 dark:hover:border-blue-500 transition-colors {draggedIndex ===
						index
							? 'opacity-50'
							: ''}"
					>
						<svg class="w-5 h-5 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
							<path
								d="M7 2a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2V4a2 2 0 00-2-2H7zm3 14a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2zm0-4a1 1 0 100-2 1 1 0 000 2z"
							/>
						</svg>
						<div class="flex-1">
							<p class="font-medium text-gray-900 dark:text-gray-100">{debt.name}</p>
							<p class="text-sm text-gray-600">
								${debt.currentBalance.toFixed(2)} at {debt.interestRate.toFixed(1)}%
							</p>
						</div>
						<span class="text-sm font-medium text-gray-500 dark:text-gray-400 dark:text-gray-500 dark:text-gray-400">#{index + 1}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
