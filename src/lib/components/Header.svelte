<script lang="ts">
	import { page } from '$app/stores';

	let { title, subtitle }: { title?: string; subtitle?: string } = $props();

	const isActive = (path: string) => {
		return $page.url.pathname === path;
	};
</script>

<header class="bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex items-center justify-between py-4">
			<!-- Logo/Brand -->
			<div class="flex items-center gap-8">
				<a href="/" class="flex items-center gap-2 group">
					<div class="text-2xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
						Billzzz
					</div>
				</a>

				<!-- Main Navigation -->
				<nav class="hidden md:flex items-center gap-1">
					<a
						href="/"
						class="px-3 py-2 rounded-md text-sm font-medium transition-colors {isActive('/')
							? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
							: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
					>
						Bills
					</a>
					<a
						href="/debt-calculator"
						class="px-3 py-2 rounded-md text-sm font-medium transition-colors {isActive(
							'/debt-calculator'
						)
							? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
							: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
					>
						Debt Calculator
					</a>
					<a
						href="/settings"
						class="px-3 py-2 rounded-md text-sm font-medium transition-colors {isActive(
							'/settings'
						)
							? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
							: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
					>
						Settings
					</a>
				</nav>
			</div>

			<!-- Mobile menu button -->
			<button
				type="button"
				aria-label="Toggle navigation menu"
				class="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800"
				onclick={() => {
					const menu = document.getElementById('mobile-menu');
					if (menu) {
						menu.classList.toggle('hidden');
					}
				}}
			>
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 6h16M4 12h16M4 18h16"
					/>
				</svg>
			</button>
		</div>

		<!-- Mobile Navigation -->
		<nav id="mobile-menu" class="hidden md:hidden pb-4 pt-2 space-y-1">
			<a
				href="/"
				class="block px-3 py-2 rounded-md text-base font-medium {isActive('/')
					? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
					: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				Bills
			</a>
			<a
				href="/debt-calculator"
				class="block px-3 py-2 rounded-md text-base font-medium {isActive('/debt-calculator')
					? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
					: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				Debt Calculator
			</a>
			<a
				href="/settings"
				class="block px-3 py-2 rounded-md text-base font-medium {isActive('/settings')
					? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-400'
					: 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}"
			>
				Settings
			</a>
		</nav>
	</div>
</header>

<!-- Page Header (optional title/subtitle) -->
{#if title}
	<div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100">{title}</h1>
			{#if subtitle}
				<p class="mt-2 text-gray-600 dark:text-gray-400">{subtitle}</p>
			{/if}
		</div>
	</div>
{/if}
