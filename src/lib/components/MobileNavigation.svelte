<script lang="ts">
	import { page } from '$app/stores';
	import { Home, Wallet, TrendingUp, Calculator, Upload, Settings } from 'lucide-svelte';

	const navItems = [
		{ href: '/', label: 'Bills', icon: Home },
		{ href: '/buckets', label: 'Buckets', icon: Wallet },
		{ href: '/analytics', label: 'Analytics', icon: TrendingUp },
		{ href: '/debt-calculator', label: 'Debt', icon: Calculator },
		{ href: '/import', label: 'Import', icon: Upload },
		{ href: '/settings', label: 'Settings', icon: Settings }
	];

	const isActive = (path: string) => {
		if (path === '/') {
			return $page.url.pathname === path;
		}
		return $page.url.pathname.startsWith(path);
	};
</script>

<nav
	class="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white/95 backdrop-blur-sm dark:border-gray-700 dark:bg-gray-800/95 md:hidden"
	style="padding-bottom: env(safe-area-inset-bottom);"
>
	<div class="grid h-16 grid-cols-6">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex flex-col items-center justify-center gap-1 transition-colors {isActive(
					item.href
				)
					? 'text-blue-600 dark:text-blue-400'
					: 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'}"
			>
				<svelte:component this={item.icon} class="h-6 w-6" />
				<span class="text-xs font-medium">{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
