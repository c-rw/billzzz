<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import Navigation from '$lib/components/Navigation.svelte';
	import MobileNavigation from '$lib/components/MobileNavigation.svelte';
	import { initializeTheme } from '$lib/stores/theme.svelte';
	import type { ThemePreference } from '$lib/stores/theme.svelte';
	import { browser } from '$app/environment';

	let { children, data } = $props();

	// Initialize theme immediately with server data (no onMount delay)
	initializeTheme(data.themePreference as ThemePreference);

	// Viewport detection for mobile navigation
	let isMobile = $state(browser && window.innerWidth < 768);

	$effect(() => {
		if (!browser) return;

		const handleResize = () => {
			isMobile = window.innerWidth < 768;
		};

		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<Navigation />
	<main class={isMobile ? 'pb-20' : ''}>
		{@render children()}
	</main>
	{#if isMobile}
		<MobileNavigation />
	{/if}
</div>
