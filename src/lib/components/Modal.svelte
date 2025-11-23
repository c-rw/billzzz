<script lang="ts">
	import { onMount } from 'svelte';
	import Button from '$lib/components/Button.svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		title: string;
		children: any;
	}

	let { isOpen = $bindable(), onClose, title, children }: Props = $props();

	let dialog: HTMLDialogElement;

	$effect(() => {
		if (!dialog) return;

		if (isOpen) {
			dialog.showModal();
			document.body.style.overflow = 'hidden';
		} else {
			dialog.close();
			document.body.style.overflow = 'auto';
		}

		// Cleanup function to ensure overflow is always restored
		return () => {
			document.body.style.overflow = 'auto';
		};
	});

	function handleBackdropClick(e: MouseEvent) {
		// Only close if clicking directly on the dialog element (backdrop)
		// not on any of its children
		if (e.target === dialog) {
			onClose();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') {
			onClose();
		}
	}
</script>

<dialog
	bind:this={dialog}
	onclick={handleBackdropClick}
	onkeydown={handleKeydown}
	class="relative rounded-lg shadow-xl bg-white dark:bg-gray-800 backdrop:bg-gray-900/50 dark:backdrop:bg-black/70 backdrop:backdrop-blur-sm"
	style="max-width: 90vw; max-height: 90vh; width: 640px;"
>
	<div class="flex min-h-0 flex-col">
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 px-6 py-4">
			<h2 class="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
			<Button variant="ghost" size="sm" onclick={onClose} title="Close modal" class="p-1">
				<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M6 18L18 6M6 6l12 12"
					/>
				</svg>
			</Button>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto px-6 py-4">
			{@render children()}
		</div>
	</div>
</dialog>

<style>
	dialog {
		padding: 0;
		border: none;
		position: fixed;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		margin: 0;
	}

	dialog::backdrop {
		background: rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(4px);
	}

	dialog[open] {
		animation: slideIn 0.2s ease-out;
	}

	@keyframes slideIn {
		from {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translate(-50%, -50%) scale(1);
		}
	}
</style>
