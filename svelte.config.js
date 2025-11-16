import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// Using adapter-node for SQLite database support with persistent filesystem
		adapter: adapter(),
		// Disable CSRF origin checking for Docker environment
		// The Origin header from browser doesn't match the containerized server's internal origin
		csrf: {
			checkOrigin: false
		}
	}
};

export default config;
