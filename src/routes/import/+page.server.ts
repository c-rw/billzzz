import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { parseOfxFile, isValidOfxFile } from '$lib/server/ofx-parser';
import {
	createImportSession,
	createImportedTransactionsBatch,
	getImportedTransactionsBySession,
	getImportSession,
	getAllCategories,
	getAllBills,
	createBill,
	addPaymentHistory,
	updateImportedTransaction,
	markTransactionsAsProcessed,
	checkDuplicateFitId
} from '$lib/server/db/queries';
import { getAllBucketsWithCurrentCycle, getAllBuckets, createTransaction, createBucket } from '$lib/server/db/bucket-queries';
import { parseLocalDate } from '$lib/utils/dates';

export const load: PageServerLoad = async ({ url }) => {
	const sessionId = url.searchParams.get('session');

	if (sessionId) {
		// Load existing import session for review
		const session = getImportSession(parseInt(sessionId));
		const allTransactions = getImportedTransactionsBySession(parseInt(sessionId));
		// Filter out already processed transactions (e.g., income that was auto-processed)
		const transactions = allTransactions.filter(t => !t.transaction.isProcessed);
		const categories = getAllCategories();
		const existingBills = getAllBills();
		const buckets = await getAllBucketsWithCurrentCycle();

		return {
			sessionId: parseInt(sessionId),
			session,
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

			// Check for duplicate transactions by fitId
			const newTransactions = [];
			let skippedCount = 0;

			for (const txn of parseResult.transactions) {
				const duplicate = checkDuplicateFitId(txn.fitId);
				if (!duplicate) {
					newTransactions.push(txn);
				} else {
					skippedCount++;
				}
			}

			// Create import session
			const session = createImportSession({
				fileName: file.name,
				fileType: fileName.endsWith('.qfx') ? 'qfx' : 'ofx',
				transactionCount: parseResult.transactions.length,
				importedCount: 0,
				skippedCount: skippedCount,
				status: 'pending'
			});

			// Insert only non-duplicate transactions into database
			let autoProcessedCount = 0;
			if (newTransactions.length > 0) {
				const transactionData = newTransactions.map((txn) => ({
					sessionId: session.id,
					fitId: txn.fitId,
					transactionType: txn.transactionType,
					datePosted: txn.datePosted,
					amount: txn.amount,
					payee: txn.payee,
					memo: txn.memo || null,
					checkNumber: txn.checkNumber || null,
					isIncome: txn.isIncome,
					isProcessed: txn.isIncome // Auto-process income immediately
				}));

				createImportedTransactionsBatch(transactionData);

				// Count auto-processed income transactions
				autoProcessedCount = newTransactions.filter(txn => txn.isIncome).length;
			}

			// Update session with auto-processed income count
			if (autoProcessedCount > 0) {
				const { updateImportSession } = await import('$lib/server/db/queries');
				updateImportSession(session.id, {
					importedCount: autoProcessedCount
				});
			}

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

			// Create a cache of bucket names to bucket IDs for deduplication
			// This includes both existing buckets and buckets created during this import session
			const existingBuckets = await getAllBuckets();
			const bucketNameMap = new Map<string, number>(
				existingBuckets.map(b => [b.name.toLowerCase().trim(), b.id])
			);

			// Create a cache of bill names to bill IDs for deduplication
			// This includes both existing bills and bills created during this import session
			const existingBills = getAllBills();
			const billNameMap = new Map<string, number>(
				existingBills.map(b => [b.name.toLowerCase().trim(), b.id])
			);

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

				if (action === 'map_existing' && billId && transactionData) {
					// Map to existing bill - add as payment history
					addPaymentHistory(billId, amount, transactionData.transaction.datePosted);
					updateImportedTransaction(transactionId, {
						mappedBillId: billId,
						isProcessed: true
					});
					importedCount++;
				} else if (action === 'create_new' && transactionData) {
					// Create new bill with deduplication
					const normalizedBillName = billName.toLowerCase().trim();
					let billIdToUse: number;
					let wasNewlyCreated = false;

					if (billNameMap.has(normalizedBillName)) {
						// Reuse existing bill
						billIdToUse = billNameMap.get(normalizedBillName)!;
					} else {
						// Create new bill
						const newBill = createBill({
							name: billName,
							amount,
							dueDate: parseLocalDate(dueDate),
							categoryId: categoryId || null,
							isRecurring: isRecurring || false,
							recurrenceType: recurrenceType || null,
							recurrenceDay: null,
							isPaid: false,
							isAutopay: false,
							notes: null,
							paymentLink: null
						});
						billIdToUse = newBill.id;
						wasNewlyCreated = true;

						// Add to cache for subsequent transactions in this import session
						billNameMap.set(normalizedBillName, newBill.id);
					}

					// Add payment history for the imported transaction (existing or newly created bill)
					addPaymentHistory(billIdToUse, amount, transactionData.transaction.datePosted, 'Payment recorded from import');

					updateImportedTransaction(transactionId, {
						mappedBillId: billIdToUse,
						createNewBill: wasNewlyCreated,
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
				} else if (action === 'create_new_bucket' && transactionData) {
					// Create new bucket from imported transaction
					const { bucketName, budgetAmount, frequency, anchorDate } = mapping;

					// Check if a bucket with this name already exists (case-insensitive)
					const normalizedBucketName = bucketName.toLowerCase().trim();
					let bucketIdToUse: number;

					if (bucketNameMap.has(normalizedBucketName)) {
						// Reuse existing bucket
						bucketIdToUse = bucketNameMap.get(normalizedBucketName)!;
					} else {
						// Create new bucket
						const newBucket = await createBucket({
							name: bucketName,
							frequency: frequency || 'monthly',
							budgetAmount: budgetAmount || amount,
							anchorDate: anchorDate ? parseLocalDate(anchorDate) : transactionData.transaction.datePosted,
							enableCarryover: true,
							icon: 'shopping-cart',
							color: null
						});
						bucketIdToUse = newBucket.id;

						// Add to cache for subsequent transactions in this import session
						bucketNameMap.set(normalizedBucketName, newBucket.id);
					}

					// Create transaction in the bucket (existing or newly created)
					await createTransaction({
						bucketId: bucketIdToUse,
						amount,
						timestamp: transactionData.transaction.datePosted,
						vendor: transactionData.transaction.payee,
						notes: transactionData.transaction.memo || undefined
					});

					updateImportedTransaction(transactionId, {
						mappedBucketId: bucketIdToUse,
						createNewBill: false,
						isProcessed: true
					});
					importedCount++;
				}
				// If action is 'skip', we just don't process it
			}

			// Update session
			if (importedCount > 0) {
				const { updateImportSession } = await import('$lib/server/db/queries');
				const session = getImportSession(sessionId);
				updateImportSession(sessionId, {
					importedCount: (session?.importedCount || 0) + importedCount,
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
