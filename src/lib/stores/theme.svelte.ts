/**
 * Theme store using Svelte 5 runes
 * Manages dark mode preference with system detection and database persistence
 */

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

// Export a $state object - this maintains reactivity across modules
export const themeStore = $state<{
	preference: ThemePreference;
	systemTheme: ResolvedTheme;
}>({
	preference: 'system',
	systemTheme: 'light'
});

/**
 * Get the resolved theme (actual light/dark value)
 * This is computed based on preference and system theme
 */
export function getResolvedTheme(): ResolvedTheme {
	return themeStore.preference === 'system' ? themeStore.systemTheme : themeStore.preference;
}

/**
 * Set theme preference and apply to document
 */
export function setPreference(newTheme: ThemePreference) {
	themeStore.preference = newTheme;
	applyTheme();
}

/**
 * Initialize theme from database value
 */
export function initializeTheme(preference: ThemePreference) {
	themeStore.preference = preference;
	detectSystemTheme();
	applyTheme();
	setupSystemThemeListener();

	// Set up reactive effect to apply theme whenever resolved theme changes
	// IMPORTANT: Must read reactive values INSIDE the effect to track them
	$effect.root(() => {
		$effect(() => {
			// Read reactive values directly in the effect to establish dependencies
			const resolvedTheme = themeStore.preference === 'system'
				? themeStore.systemTheme
				: themeStore.preference;

			// Apply theme to DOM
			if (typeof document !== 'undefined') {
				const root = document.documentElement;
				if (resolvedTheme === 'dark') {
					root.classList.add('dark');
				} else {
					root.classList.remove('dark');
				}
			}
		});
	});
}

/**
 * Detect system color scheme preference
 */
function detectSystemTheme() {
	if (typeof window === 'undefined') return;

	const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	themeStore.systemTheme = prefersDark ? 'dark' : 'light';
}

/**
 * Apply theme class to document root
 */
function applyTheme() {
	if (typeof document === 'undefined') return;

	const root = document.documentElement;
	const resolvedTheme = getResolvedTheme();

	if (resolvedTheme === 'dark') {
		root.classList.add('dark');
	} else {
		root.classList.remove('dark');
	}
}

/**
 * Listen for system theme changes
 */
function setupSystemThemeListener() {
	if (typeof window === 'undefined') return;

	const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

	const handleChange = (e: MediaQueryListEvent) => {
		themeStore.systemTheme = e.matches ? 'dark' : 'light';
		applyTheme();
	};

	// Modern browsers
	if (mediaQuery.addEventListener) {
		mediaQuery.addEventListener('change', handleChange);
	} else {
		// Fallback for older browsers
		mediaQuery.addListener(handleChange);
	}
}
