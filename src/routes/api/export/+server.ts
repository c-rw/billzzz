import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db/index';
import {
	bills,
	categories,
	buckets,
	bucketCycles,
	bucketTransactions,
	debts,
	debtPayments,
	debtStrategySettings,
	paydaySettings
} from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
	try {
		// Export all data (excluding payment history)
		const exportData = {
			version: '1.0',
			exportDate: new Date().toISOString(),
			data: {
				categories: db.select().from(categories).all(),
				bills: db.select().from(bills).all(),
				buckets: db.select().from(buckets).all(),
				bucketCycles: db.select().from(bucketCycles).all(),
				bucketTransactions: db.select().from(bucketTransactions).all(),
				debts: db.select().from(debts).all(),
				debtPayments: db.select().from(debtPayments).all(),
				debtStrategySettings: db.select().from(debtStrategySettings).all(),
				paydaySettings: db.select().from(paydaySettings).all()
			}
		};

		// Create filename with timestamp
		const filename = `billzzz-backup-${new Date().toISOString().split('T')[0]}.json`;

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
