import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { parseOfxFile, isValidOfxFile } from '$lib/server/ofx-parser';
import {
	createImportSession,
	createImportedTransactionsBatch,
	getImportedTransactionsBySession,
	getAllCategories,
	getAllBills,
	createBill,
	addPaymentHistory,
	updateImportedTransaction,
	markTransactionsAsProcessed
} from '$lib/server/db/queries';
import { getAllBucketsWithCurrentCycle, createTransaction } from '$lib/server/db/bucket-queries';

export const load: PageServerLoad = async ({ url }) => {
	const sessionId = url.searchParams.get('session');

	if (sessionId) {
		// Load existing import session for review
		const transactions = getImportedTransactionsBySession(parseInt(sessionId));
		const categories = getAllCategories();
		const existingBills = getAllBills();
		const buckets = await getAllBucketsWithCurrentCycle();

		return {
			sessionId: parseInt(sessionId),
			transactions,
			categories,
			existingBills,
			buckets
		};
	}

	return {
		sessionId: null,
		transactions: [],
		categories: [],
		existingBills: [],
		buckets: []
	};
};

export const actions: Actions = {
	upload: async ({ request }) => {
		try {
			const formData = await request.formData();
			const file = formData.get('ofxFile') as File;

			// Validate file
			if (!file || file.size === 0) {
				return fail(400, { error: 'Please select a file to upload' });
			}

			// Check file extension
			const fileName = file.name.toLowerCase();
			if (!fileName.endsWith('.ofx') && !fileName.endsWith('.qfx')) {
				return fail(400, {
					error: 'Invalid file type. Please upload an OFX or QFX file (.ofx or .qfx)'
				});
			}

			// Check file size (limit to 10MB)
			const maxSize = 10 * 1024 * 1024; // 10MB
			if (file.size > maxSize) {
				return fail(400, { error: 'File size exceeds 10MB limit' });
			}

			// Read file buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			// Validate OFX format
			if (!isValidOfxFile(buffer)) {
				return fail(400, {
					error: 'File does not appear to be a valid OFX/QFX file'
				});
			}

			// Parse OFX file
			let parseResult;
			try {
				parseResult = await parseOfxFile(buffer);
			} catch (error) {
				console.error('OFX parsing error:', error);
				return fail(400, {
					error: `Failed to parse OFX file: ${error instanceof Error ? error.message : 'Unknown error'}`
				});
			}

			if (parseResult.transactions.length === 0) {
				return fail(400, { error: 'No transactions found in the OFX file' });
			}

			// Create import session
			const session = createImportSession({
				fileName: file.name,
				fileType: fileName.endsWith('.qfx') ? 'qfx' : 'ofx',
				transactionCount: parseResult.transactions.length,
				importedCount: 0,
				status: 'pending'
			});

			// Insert transactions into database
			const transactionData = parseResult.transactions.map((txn) => ({
				sessionId: session.id,
				fitId: txn.fitId,
				transactionType: txn.transactionType,
				datePosted: txn.datePosted,
				amount: txn.amount,
				payee: txn.payee,
				memo: txn.memo || null,
				checkNumber: txn.checkNumber || null,
				isProcessed: false
			}));

			createImportedTransactionsBatch(transactionData);

			// Redirect to review page
			throw redirect(302, `/import?session=${session.id}`);
		} catch (error) {
			// Don't catch redirect errors - let them propagate
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			console.error('Upload error:', error);
			return fail(500, {
				error: 'An unexpected error occurred while processing the file'
			});
		}
	},

	processTransactions: async ({ request }) => {
		try {
			const formData = await request.formData();
			const sessionId = parseInt(formData.get('sessionId') as string);
			const mappings = JSON.parse(formData.get('mappings') as string);

			let importedCount = 0;

			// Get all transaction details for bucket mapping
			const sessionTransactions = getImportedTransactionsBySession(sessionId);

			for (const mapping of mappings) {
				const {
					transactionId,
					action,
					billId,
					billName,
					amount,
					dueDate,
					categoryId,
					isRecurring,
					recurrenceType,
					bucketId
				} = mapping;

				// Find the full transaction data
				const transactionData = sessionTransactions.find(t => t.transaction.id === transactionId);

				if (action === 'map_existing' && billId) {
					// Map to existing bill - add as payment history
					addPaymentHistory(billId, amount);
					updateImportedTransaction(transactionId, {
						mappedBillId: billId,
						isProcessed: true
					});
					importedCount++;
				} else if (action === 'create_new') {
					// Create new bill
					const newBill = createBill({
						name: billName,
						amount,
						dueDate: new Date(dueDate),
						categoryId: categoryId || null,
						isRecurring: isRecurring || false,
						recurrenceType: recurrenceType || null,
						recurrenceDay: null,
						isPaid: false,
						isAutopay: false,
						notes: null,
						paymentLink: null
					});

					updateImportedTransaction(transactionId, {
						mappedBillId: newBill.id,
						createNewBill: true,
						isProcessed: true
					});
					importedCount++;
				} else if (action === 'map_to_bucket' && bucketId && transactionData) {
					// Map to bucket - create bucket transaction
					await createTransaction({
						bucketId,
						amount,
						timestamp: transactionData.transaction.datePosted,
						vendor: transactionData.transaction.payee,
						notes: transactionData.transaction.memo || undefined
					});

					updateImportedTransaction(transactionId, {
						mappedBucketId: bucketId,
						isProcessed: true
					});
					importedCount++;
				}
				// If action is 'skip', we just don't process it
			}

			// Update session
			if (importedCount > 0) {
				const { updateImportSession } = await import('$lib/server/db/queries');
				updateImportSession(sessionId, {
					importedCount,
					status: 'completed'
				});
			}

			throw redirect(302, '/');
		} catch (error) {
			// Don't catch redirect errors - let them propagate
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			console.error('Process transactions error:', error);
			return fail(500, {
				error: 'Failed to process transactions'
			});
		}
	}
};
