import { defineConfig } from 'drizzle-kit';

export default defineConfig({
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'sqlite',
	dbCredentials: {
		url: './data/bills.db'
	},
	verbose: true,
	strict: true
});
