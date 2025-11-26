<script lang="ts">
	let {
		title,
		value,
		subtitle = '',
		variant = 'default',
		highlight = false
	}: {
		title: string;
		value: string;
		subtitle?: string;
		variant?: 'default' | 'success' | 'warning' | 'danger';
		highlight?: boolean;
	} = $props();

	const variantClasses = {
		default: 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800',
		success: 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950',
		warning: 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950',
		danger: 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950'
	};

	const valueColorClasses = {
		default: 'text-gray-900 dark:text-gray-100',
		success: 'text-green-900 dark:text-green-100',
		warning: 'text-yellow-900 dark:text-yellow-100',
		danger: 'text-red-900 dark:text-red-100'
	};

	const subtitleColorClasses = {
		default: 'text-gray-500 dark:text-gray-400',
		success: 'text-green-700 dark:text-green-300',
		warning: 'text-yellow-700 dark:text-yellow-300',
		danger: 'text-red-700 dark:text-red-300'
	};
</script>

<div
	class="rounded-lg border p-6 shadow-sm transition-all {variantClasses[variant]} {highlight
		? 'ring-2 ring-blue-500 dark:ring-blue-400'
		: ''}"
>
	<p class="text-sm font-medium {subtitleColorClasses[variant]}">{title}</p>
	<p class="mt-2 text-3xl font-bold {valueColorClasses[variant]}">
		{value}
	</p>
	{#if subtitle}
		<p class="mt-1 text-sm {subtitleColorClasses[variant]}">{subtitle}</p>
	{/if}
</div>
