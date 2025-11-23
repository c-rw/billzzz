<script lang="ts">
	import { page } from '$app/stores';

	const isActive = (path: string) => $page.url.pathname === path || $page.url.pathname.startsWith(path + '/');
</script>

<nav class="border-b border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="flex h-16 items-center justify-between">
			<div class="flex items-center gap-8">
				<a href="/" class="text-xl font-bold text-gray-900 dark:text-gray-100">Billzzz</a>

				<div class="flex gap-4">
					<a
						href="/"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive('/')
							? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
					>
						Bills
					</a>
					<a
						href="/buckets"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive('/buckets')
							? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
					>
						Buckets
					</a>
					<a
						href="/import"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive('/import')
							? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
					>
						Import
					</a>
					<a
						href="/debt-calculator"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive('/debt-calculator')
							? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
					>
						Debt Calculator
					</a>
					<a
						href="/settings"
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {isActive('/settings')
							? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400'
							: 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}"
					>
						Settings
					</a>
				</div>
			</div>
		</div>
	</div>
</nav>
