<script lang="ts">
	import type { Category } from '$lib/types/bill';
	import {
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

	interface Props {
		category?: Category | null;
	}

	let { category }: Props = $props();

	const iconMap = {
		'shopping-cart': ShoppingCart,
		'fuel': Fuel,
		'utensils': Utensils,
		'coffee': Coffee,
		'popcorn': Popcorn,
		'dumbbell': Dumbbell,
		'gamepad': Gamepad2,
		'smartphone': Smartphone,
		'shirt': Shirt,
		'home': Home,
		'dog': Dog,
		'heart': Heart
	};

	const IconComponent = $derived(category?.icon ? iconMap[category.icon as keyof typeof iconMap] : null);
</script>

{#if category}
	<span
		class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
		style="background-color: {category.color}20; color: {category.color}; border: 1px solid {category.color}40;"
	>
		{#if IconComponent}
			<IconComponent size={14} />
		{/if}
		{category.name}
	</span>
{:else}
	<span class="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs text-gray-600 dark:text-gray-400">
		Uncategorized
	</span>
{/if}
