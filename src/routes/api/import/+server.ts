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

interface ImportData {
	version: string;
	exportDate: string;
	data: {
		categories: any[];
		bills: any[];
		billCycles: any[];
		billPayments: any[];
		buckets: any[];
		bucketCycles: any[];
		bucketTransactions: any[];
		debts: any[];
		debtPayments: any[];
		debtStrategySettings: any[];
		paydaySettings: any[];
		// v2.0 fields (optional for backward compatibility with v1.0 backups)
		accounts?: any[];
		importSessions?: any[];
		importedTransactions?: any[];
		transfers?: any[];
		userPreferences?: any[];
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
		// v2.0 tables first (they reference importedTransactions/accounts)
		db.delete(transfers).run();
		db.delete(importedTransactions).run();
		db.delete(importSessions).run();
		db.delete(accounts).run();
		db.delete(userPreferences).run();
		// Original v1.0 tables
		db.delete(bucketTransactions).run();
		db.delete(bucketCycles).run();
		db.delete(buckets).run();
		db.delete(billPayments).run();
		db.delete(billCycles).run();
		db.delete(bills).run();
		db.delete(debtPayments).run();
		db.delete(debts).run();
		db.delete(debtStrategySettings).run();
		db.delete(paydaySettings).run();
		db.delete(categories).run();

		let importedCounts: Record<string, number> = {
			categories: 0,
			bills: 0,
			billCycles: 0,
			billPayments: 0,
			buckets: 0,
			bucketCycles: 0,
			bucketTransactions: 0,
			debts: 0,
			debtPayments: 0,
			debtStrategySettings: 0,
			paydaySettings: 0,
			accounts: 0,
			importSessions: 0,
			importedTransactions: 0,
			transfers: 0,
			userPreferences: 0
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

		if (importData.data.billCycles?.length > 0) {
			db.insert(billCycles).values(importData.data.billCycles).run();
			importedCounts.billCycles = importData.data.billCycles.length;
		}

		if (importData.data.billPayments?.length > 0) {
			db.insert(billPayments).values(importData.data.billPayments).run();
			importedCounts.billPayments = importData.data.billPayments.length;
		}

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

		// v2.0 tables (accounts/import data/transfers)
		if (importData.data.accounts && importData.data.accounts.length > 0) {
			db.insert(accounts).values(importData.data.accounts).run();
			importedCounts.accounts = importData.data.accounts.length;
		}

		if (importData.data.importSessions && importData.data.importSessions.length > 0) {
			db.insert(importSessions).values(importData.data.importSessions).run();
			importedCounts.importSessions = importData.data.importSessions.length;
		}

		if (importData.data.importedTransactions && importData.data.importedTransactions.length > 0) {
			db.insert(importedTransactions).values(importData.data.importedTransactions).run();
			importedCounts.importedTransactions = importData.data.importedTransactions.length;
		}

		if (importData.data.transfers && importData.data.transfers.length > 0) {
			db.insert(transfers).values(importData.data.transfers).run();
			importedCounts.transfers = importData.data.transfers.length;
		}

		if (importData.data.userPreferences && importData.data.userPreferences.length > 0) {
			db.insert(userPreferences).values(importData.data.userPreferences).run();
			importedCounts.userPreferences = importData.data.userPreferences.length;
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
