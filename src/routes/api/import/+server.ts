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
	paydaySettings,
	paymentHistory
} from '$lib/server/db/schema';

interface ImportData {
	version: string;
	exportDate: string;
	data: {
		categories: any[];
		bills: any[];
		buckets: any[];
		bucketCycles: any[];
		bucketTransactions: any[];
		debts: any[];
		debtPayments: any[];
		debtStrategySettings: any[];
		paydaySettings: any[];
		// paymentHistory is intentionally excluded from backups
		paymentHistory?: any[];
	};
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		console.log('Import request received');
		const formData = await request.formData();
		console.log('FormData parsed');
		const file = formData.get('file') as File;

		if (!file) {
			console.log('No file in form data');
			return json({ error: 'No file provided' }, { status: 400 });
		}

		console.log('File received:', file.name, file.size);

		// Read and parse the JSON file
		const content = await file.text();
		console.log('File content length:', content.length);
		let importData: ImportData;

		try {
			importData = JSON.parse(content);
			console.log('JSON parsed successfully');
		} catch (error) {
			console.error('JSON parse error:', error);
			return json({ error: 'Invalid JSON file' }, { status: 400 });
		}

		// Validate the data structure
		if (!importData.version || !importData.data) {
			return json({ error: 'Invalid backup file format' }, { status: 400 });
		}

		// Clear existing data (in reverse order due to foreign key constraints)
		db.delete(bucketTransactions).run();
		db.delete(bucketCycles).run();
		db.delete(buckets).run();
		db.delete(paymentHistory).run();
		db.delete(bills).run();
		db.delete(debtPayments).run();
		db.delete(debts).run();
		db.delete(debtStrategySettings).run();
		db.delete(paydaySettings).run();
		db.delete(categories).run();

		let importedCounts = {
			categories: 0,
			bills: 0,
			buckets: 0,
			bucketCycles: 0,
			bucketTransactions: 0,
			debts: 0,
			debtPayments: 0,
			debtStrategySettings: 0,
			paydaySettings: 0
		};

		// Import data (in order to respect foreign key constraints)
		if (importData.data.categories?.length > 0) {
			db.insert(categories).values(importData.data.categories).run();
			importedCounts.categories = importData.data.categories.length;
		}

		if (importData.data.paydaySettings?.length > 0) {
			db.insert(paydaySettings).values(importData.data.paydaySettings).run();
			importedCounts.paydaySettings = importData.data.paydaySettings.length;
		}

		if (importData.data.bills?.length > 0) {
			db.insert(bills).values(importData.data.bills).run();
			importedCounts.bills = importData.data.bills.length;
		}

		// Payment history is intentionally not imported from backups

		if (importData.data.buckets?.length > 0) {
			db.insert(buckets).values(importData.data.buckets).run();
			importedCounts.buckets = importData.data.buckets.length;
		}

		if (importData.data.bucketCycles?.length > 0) {
			db.insert(bucketCycles).values(importData.data.bucketCycles).run();
			importedCounts.bucketCycles = importData.data.bucketCycles.length;
		}

		if (importData.data.bucketTransactions?.length > 0) {
			db.insert(bucketTransactions).values(importData.data.bucketTransactions).run();
			importedCounts.bucketTransactions = importData.data.bucketTransactions.length;
		}

		if (importData.data.debts?.length > 0) {
			db.insert(debts).values(importData.data.debts).run();
			importedCounts.debts = importData.data.debts.length;
		}

		if (importData.data.debtPayments?.length > 0) {
			db.insert(debtPayments).values(importData.data.debtPayments).run();
			importedCounts.debtPayments = importData.data.debtPayments.length;
		}

		if (importData.data.debtStrategySettings?.length > 0) {
			db.insert(debtStrategySettings).values(importData.data.debtStrategySettings).run();
			importedCounts.debtStrategySettings = importData.data.debtStrategySettings.length;
		}

		return json({
			success: true,
			message: 'Data imported successfully',
			imported: importedCounts
		});
	} catch (error) {
		console.error('Import error:', error);
		return json(
			{ error: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}` },
			{ status: 500 }
		);
	}
};
