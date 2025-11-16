import type { PageServerLoad, Actions } from './$types';
import { getAllPaymentHistory, getAllCategories, getPaydaySettings } from '$lib/server/db/queries';
import { fail } from '@sveltejs/kit';
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
	paymentHistory,
	importSessions,
	importedTransactions
} from '$lib/server/db/schema';

interface ImportData {
	version: string;
	exportDate: string;
	data: {
		categories: any[];
		bills: any[];
		paymentHistory: any[];
		buckets: any[];
		bucketCycles: any[];
		bucketTransactions: any[];
		debts: any[];
		debtPayments: any[];
		debtStrategySettings: any[];
		paydaySettings: any[];
	};
}

/**
 * Convert ISO date strings back to Date objects for Drizzle ORM
 * Drizzle with mode: 'timestamp' expects Date objects, not strings
 */
function convertDatesToObjects(data: any[]): any[] {
	return data.map((item) => {
		const converted = { ...item };
		for (const key in converted) {
			// Check if value is an ISO date string
			if (
				typeof converted[key] === 'string' &&
				/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(converted[key])
			) {
				converted[key] = new Date(converted[key]);
			}
		}
		return converted;
	});
}

export const load: PageServerLoad = async () => {
	const paymentHistoryData = getAllPaymentHistory();
	const categoriesData = getAllCategories();
	const paydaySettingsData = getPaydaySettings();

	return {
		paymentHistory: paymentHistoryData,
		categories: categoriesData,
		paydaySettings: paydaySettingsData
	};
};

export const actions: Actions = {
	importData: async ({ request }) => {
		try {
			console.log('Import request received');
			const formData = await request.formData();
			const file = formData.get('file') as File;

			if (!file) {
				console.log('No file in form data');
				return fail(400, { error: 'No file provided' });
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
				return fail(400, { error: 'Invalid JSON file' });
			}

			// Validate the data structure
			if (!importData.version || !importData.data) {
				return fail(400, { error: 'Invalid backup file format' });
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
				paymentHistory: 0,
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
				const convertedCategories = convertDatesToObjects(importData.data.categories);
				db.insert(categories).values(convertedCategories).run();
				importedCounts.categories = importData.data.categories.length;
			}

			if (importData.data.paydaySettings?.length > 0) {
				const convertedPaydaySettings = convertDatesToObjects(importData.data.paydaySettings);
				db.insert(paydaySettings).values(convertedPaydaySettings).run();
				importedCounts.paydaySettings = importData.data.paydaySettings.length;
			}

			if (importData.data.bills?.length > 0) {
				const convertedBills = convertDatesToObjects(importData.data.bills);
				db.insert(bills).values(convertedBills).run();
				importedCounts.bills = importData.data.bills.length;
			}

			if (importData.data.paymentHistory?.length > 0) {
				const convertedPaymentHistory = convertDatesToObjects(importData.data.paymentHistory);
				db.insert(paymentHistory).values(convertedPaymentHistory).run();
				importedCounts.paymentHistory = importData.data.paymentHistory.length;
			}

			if (importData.data.buckets?.length > 0) {
				const convertedBuckets = convertDatesToObjects(importData.data.buckets);
				db.insert(buckets).values(convertedBuckets).run();
				importedCounts.buckets = importData.data.buckets.length;
			}

			if (importData.data.bucketCycles?.length > 0) {
				const convertedBucketCycles = convertDatesToObjects(importData.data.bucketCycles);
				db.insert(bucketCycles).values(convertedBucketCycles).run();
				importedCounts.bucketCycles = importData.data.bucketCycles.length;
			}

			if (importData.data.bucketTransactions?.length > 0) {
				const convertedBucketTransactions = convertDatesToObjects(
					importData.data.bucketTransactions
				);
				db.insert(bucketTransactions).values(convertedBucketTransactions).run();
				importedCounts.bucketTransactions = importData.data.bucketTransactions.length;
			}

			if (importData.data.debts?.length > 0) {
				const convertedDebts = convertDatesToObjects(importData.data.debts);
				db.insert(debts).values(convertedDebts).run();
				importedCounts.debts = importData.data.debts.length;
			}

			if (importData.data.debtPayments?.length > 0) {
				const convertedDebtPayments = convertDatesToObjects(importData.data.debtPayments);
				db.insert(debtPayments).values(convertedDebtPayments).run();
				importedCounts.debtPayments = importData.data.debtPayments.length;
			}

			if (importData.data.debtStrategySettings?.length > 0) {
				const convertedDebtStrategySettings = convertDatesToObjects(
					importData.data.debtStrategySettings
				);
				db.insert(debtStrategySettings).values(convertedDebtStrategySettings).run();
				importedCounts.debtStrategySettings = importData.data.debtStrategySettings.length;
			}

			console.log('Import successful:', importedCounts);

			return {
				success: true,
				message: 'Data imported successfully',
				imported: importedCounts
			};
		} catch (error) {
			console.error('Import error:', error);
			return fail(500, {
				error: `Failed to import data: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		}
	},

	resetData: async ({ request }) => {
		try {
			const formData = await request.formData();
			const confirmation = formData.get('confirmation');

			// Require explicit confirmation
			if (confirmation !== 'DELETE ALL DATA') {
				return fail(400, { error: 'Invalid confirmation. Please type "DELETE ALL DATA" exactly.' });
			}

			// Delete all data (in reverse order due to foreign key constraints)
			db.delete(importedTransactions).run();
			db.delete(importSessions).run();
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

			console.log('All data has been reset');

			return {
				success: true,
				message: 'All data has been deleted successfully'
			};
		} catch (error) {
			console.error('Reset error:', error);
			return fail(500, {
				error: `Failed to reset data: ${error instanceof Error ? error.message : 'Unknown error'}`
			});
		}
	}
};
