<script lang="ts">
	import { format } from 'date-fns';

	let {
		type,
		severity,
		date,
		message,
		amount
	}: {
		type: 'negative_balance' | 'low_balance' | 'large_expense';
		severity: 'high' | 'medium' | 'low';
		date: Date;
		message: string;
		amount?: number;
	} = $props();

	const severityConfig = {
		high: {
			bgColor: 'bg-red-50 dark:bg-red-950',
			borderColor: 'border-red-200 dark:border-red-800',
			iconColor: 'text-red-600 dark:text-red-400',
			textColor: 'text-red-900 dark:text-red-100',
			subtextColor: 'text-red-700 dark:text-red-300'
		},
		medium: {
			bgColor: 'bg-yellow-50 dark:bg-yellow-950',
			borderColor: 'border-yellow-200 dark:border-yellow-800',
			iconColor: 'text-yellow-600 dark:text-yellow-400',
			textColor: 'text-yellow-900 dark:text-yellow-100',
			subtextColor: 'text-yellow-700 dark:text-yellow-300'
		},
		low: {
			bgColor: 'bg-blue-50 dark:bg-blue-950',
			borderColor: 'border-blue-200 dark:border-blue-800',
			iconColor: 'text-blue-600 dark:text-blue-400',
			textColor: 'text-blue-900 dark:text-blue-100',
			subtextColor: 'text-blue-700 dark:text-blue-300'
		}
	};

	const config = severityConfig[severity];

	const iconPath = {
		negative_balance:
			'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
		low_balance:
			'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
		large_expense:
			'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
	};
</script>

<div
	class="rounded-lg border p-4 {config.bgColor} {config.borderColor}"
>
	<div class="flex items-start gap-3">
		<svg
			class="h-5 w-5 {config.iconColor} mt-0.5 shrink-0"
			fill="none"
			stroke="currentColor"
			viewBox="0 0 24 24"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d={iconPath[type]}
			/>
		</svg>
		<div class="flex-1 min-w-0">
			<div class="flex items-start justify-between gap-2">
				<p class="text-sm font-medium {config.textColor}">
					{message}
				</p>
				<span class="text-xs font-medium {config.subtextColor} whitespace-nowrap">
					{format(date, 'MMM d')}
				</span>
			</div>
		</div>
	</div>
</div>
