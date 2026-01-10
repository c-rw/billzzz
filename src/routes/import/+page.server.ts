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
	updateImportedTransaction,
	markTransactionsAsProcessed,
	checkDuplicateFitId,
	markBillAsPaid,
	updateBill
} from '$lib/server/db/queries';
import { getAllBucketsWithCurrentCycle, getAllBuckets, createTransaction, createBucket } from '$lib/server/db/bucket-queries';
import { createPayment } from '$lib/server/db/bill-queries';
import { parseLocalDate } from '$lib/utils/dates';
import { calculateNextDueDate } from '$lib/server/utils/recurrence';

/**
 * Check if a payment date falls within the current billing cycle for a bill
 * Current cycle is defined as: 30 days before due date to 7 days after due date
 */
function isPaymentForCurrentCycle(paymentDate: Date, billDueDate: Date): boolean {
	const cycleStart = new Date(billDueDate);
	cycleStart.setDate(cycleStart.getDate() - 30); // 30 days before due date

	const cycleEnd = new Date(billDueDate);
	cycleEnd.setDate(cycleEnd.getDate() + 7); // 7 days grace period after due date

	return paymentDate >= cycleStart && paymentDate <= cycleEnd;
}

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
			const { getAllAccounts } = await import('$lib/server/db/queries');
			const accounts = getAllAccounts();

			return {
				sessionId: parseInt(sessionId),
				session,
				transactions,
				categories,
				existingBills,
				buckets,
				accounts
			};
	}

	return {
		sessionId: null,
		transactions: [],
		categories: [],
		existingBills: [],
		buckets: [],
		accounts: []
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
			const seenFitIds = new Set<string>(); // Track fitIds in current batch

			for (const txn of parseResult.transactions) {
				// Check if already seen in current batch (prevents duplicates within same file)
				if (seenFitIds.has(txn.fitId)) {
					skippedCount++;
					continue;
				}

				// Check if already exists in database (processed OR unprocessed)
				const duplicate = checkDuplicateFitId(txn.fitId);
				if (!duplicate) {
					newTransactions.push(txn);
					seenFitIds.add(txn.fitId);
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
					bucketId,
					counterpartyAccountId,
					transferCategoryId
				} = mapping;

				// Find the full transaction data
				const transactionData = sessionTransactions.find(t => t.transaction.id === transactionId);

				if (action === 'map_existing' && billId && transactionData) {
					// Map to existing bill - create payment
					await createPayment({
						billId,
						amount,
						paymentDate: transactionData.transaction.datePosted,
						notes: 'Payment recorded from import'
					});

					// Check if this payment is for the current billing cycle
					const existingBill = existingBills.find(b => b.id === billId);
					if (existingBill && isPaymentForCurrentCycle(transactionData.transaction.datePosted, existingBill.dueDate)) {
						markBillAsPaid(billId, true);
					}

					// If this is a recurring bill that was marked as paid, advance the due date
					if (existingBill && isPaymentForCurrentCycle(transactionData.transaction.datePosted, existingBill.dueDate)) {
						if (existingBill.isRecurring && existingBill.recurrenceType) {
							const nextDueDate = calculateNextDueDate(
								existingBill.dueDate,
								existingBill.recurrenceType as any,
								existingBill.recurrenceDay
							);

							updateBill(billId, {
								isPaid: false,
								dueDate: nextDueDate
							});
						}
					}

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

					// Validate due date before creating bill
					let billDueDate: Date;
					try {
						if (!dueDate || (typeof dueDate === 'string' && dueDate.trim() === '')) {
							// Fallback to transaction date if no due date provided
							console.log(`No due date provided for bill "${billName}", using transaction date as fallback`);
							billDueDate = transactionData.transaction.datePosted;
						} else {
							billDueDate = parseLocalDate(dueDate);
						}
					} catch (error) {
						console.error('Error parsing bill due date:', { billName, dueDate, error });
						// Fallback to transaction date on parsing error
						billDueDate = transactionData.transaction.datePosted;
					}

					const paymentDate = transactionData.transaction.datePosted;

					// Check if payment is for current billing cycle
					const shouldMarkAsPaid = isPaymentForCurrentCycle(paymentDate, billDueDate);

					if (billNameMap.has(normalizedBillName)) {
						// Reuse existing bill
						billIdToUse = billNameMap.get(normalizedBillName)!;
					} else {
						// Create new bill with error handling
						try {
							const newBill = createBill({
								name: billName,
								amount,
								dueDate: billDueDate,
								categoryId: categoryId || null,
								isRecurring: isRecurring || false,
								recurrenceType: recurrenceType || null,
								recurrenceDay: (isRecurring && recurrenceType === 'monthly') ? billDueDate.getDate() : null,
								isPaid: shouldMarkAsPaid,
								isAutopay: false,
								notes: null,
								paymentLink: null
							});
							billIdToUse = newBill.id;
							wasNewlyCreated = true;

							// Add to cache for subsequent transactions in this import session
							billNameMap.set(normalizedBillName, newBill.id);
						} catch (error) {
							console.error('Error creating bill:', error);
							// Skip this transaction and continue with others
							continue;
						}
					}

					// Add payment for the imported transaction (existing or newly created bill)
					await createPayment({
						billId: billIdToUse,
						amount,
						paymentDate: transactionData.transaction.datePosted,
						notes: 'Payment recorded from import'
					});

					// If reusing existing bill and payment is for current cycle, mark as paid
					if (!wasNewlyCreated && shouldMarkAsPaid) {
						markBillAsPaid(billIdToUse, true);
					}


					// If this is a recurring bill that was marked as paid, advance the due date
					if (shouldMarkAsPaid && (isRecurring || !wasNewlyCreated)) {
						// For newly created bills, use the values from the form
						// For existing bills, we need to check if they are recurring
						const billToUpdate = wasNewlyCreated
							? { isRecurring, recurrenceType, recurrenceDay: billDueDate.getDate() }
							: existingBills.find(b => b.id === billIdToUse);

						if (billToUpdate?.isRecurring && billToUpdate.recurrenceType) {
							const nextDueDate = calculateNextDueDate(
								billDueDate,
								billToUpdate.recurrenceType as any,
								billToUpdate.recurrenceDay || billDueDate.getDate()
							);

							updateBill(billIdToUse, {
								isPaid: false,
								dueDate: nextDueDate
							});
						}
					}
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
						// Validate anchor date before creating bucket
						let bucketAnchorDate: Date;
						try {
							if (anchorDate && typeof anchorDate === 'string' && anchorDate.trim() !== '') {
								bucketAnchorDate = parseLocalDate(anchorDate);
							} else {
								// Fallback to transaction date if no anchor date provided
								console.log(`No anchor date provided for bucket "${bucketName}", using transaction date as fallback`);
								bucketAnchorDate = transactionData.transaction.datePosted;
							}
						} catch (error) {
							console.error('Error parsing bucket anchor date:', { bucketName, anchorDate, error });
							// Fallback to transaction date on parsing error
							bucketAnchorDate = transactionData.transaction.datePosted;
						}

						// Create new bucket with error handling
						try {
							const newBucket = await createBucket({
								name: bucketName,
								frequency: frequency || 'monthly',
								budgetAmount: budgetAmount || amount,
								anchorDate: bucketAnchorDate,
								enableCarryover: true,
								icon: 'shopping-cart',
								color: null
							});
							bucketIdToUse = newBucket.id;

							// Add to cache for subsequent transactions in this import session
							bucketNameMap.set(normalizedBucketName, newBucket.id);
						} catch (error) {
							console.error('Error creating bucket:', error);
							// Skip this transaction and continue with others
							continue;
						}
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
				} else if (action === 'mark_transfer' && transactionData) {
					if (!counterpartyAccountId) {
						continue;
					}

					updateImportedTransaction(transactionId, {
						isTransfer: true,
						counterpartyAccountId,
						transferCategoryId: transferCategoryId || null,
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
