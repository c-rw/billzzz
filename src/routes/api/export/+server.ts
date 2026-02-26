import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index';
import {
	bills,
	billCycles,
	billPayments,
	categories,
	buckets,
	bucketCycles,
	bucketTransactions,
	debts,
	debtPayments,
	debtStrategySettings,
	paydaySettings,
	accounts,
	importSessions,
	importedTransactions,
	transfers,
	userPreferences
} from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		// Export all data
		const exportData = {
			version: '2.0',
			exportDate: new Date().toISOString(),
			data: {
				categories: db.select().from(categories).all(),
				bills: db.select().from(bills).all(),
				billCycles: db.select().from(billCycles).all(),
				billPayments: db.select().from(billPayments).all(),
				buckets: db.select().from(buckets).all(),
				bucketCycles: db.select().from(bucketCycles).all(),
				bucketTransactions: db.select().from(bucketTransactions).all(),
				debts: db.select().from(debts).all(),
				debtPayments: db.select().from(debtPayments).all(),
				debtStrategySettings: db.select().from(debtStrategySettings).all(),
				paydaySettings: db.select().from(paydaySettings).all(),
				accounts: db.select().from(accounts).all(),
				importSessions: db.select().from(importSessions).all(),
				importedTransactions: db.select().from(importedTransactions).all(),
				transfers: db.select().from(transfers).all(),
				userPreferences: db.select().from(userPreferences).all()
			}
		};

		// Create filename with timestamp
		const now = new Date();
		const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
		const filename = `billzzz-backup-${dateStr}.json`;

		// Return as downloadable JSON file
		return new Response(JSON.stringify(exportData, null, 2), {
			headers: {
				'Content-Type': 'application/json',
				'Content-Disposition': `attachment; filename="${filename}"`
			}
		});
	} catch (error) {
		console.error('Export error:', error);
		return json({ error: 'Failed to export data' }, { status: 500 });
	}
};
