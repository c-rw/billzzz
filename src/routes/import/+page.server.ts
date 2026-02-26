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
import { getAllAccounts, getAccountByBankInfo, createAccount } from '$lib/server/db/account-queries';
import { detectPotentialTransfers, findAndLinkTransferMatch } from '$lib/server/db/transfer-queries';
import { createPayment } from '$lib/server/db/bill-queries';
import { parseLocalDate, utcDateToLocal } from '$lib/utils/dates';
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
	const newAccountParam = url.searchParams.get('newAccount');
	const accounts = getAllAccounts();

	if (sessionId) {
		// Load existing import session for review
		const session = getImportSession(parseInt(sessionId));
		const allTransactions = getImportedTransactionsBySession(parseInt(sessionId));
		// Filter out already processed transactions
		const transactions = allTransactions.filter(t => !t.transaction.isProcessed);
		const categories = getAllCategories();
		const existingBills = getAllBills();
		const buckets = await getAllBucketsWithCurrentCycle();

		// If newAccount flag is set, we need to show the account confirmation step
		const showAccountConfirmation = newAccountParam === 'true';

		// Parse detected account info from query params (passed from upload action)
		const detectedAccountType = url.searchParams.get('accountType');
		const detectedAccountNumber = url.searchParams.get('accountNumber');
		const detectedBankId = url.searchParams.get('bankId');

		return {
			sessionId: parseInt(sessionId),
			session,
			transactions,
			categories,
			existingBills,
			buckets,
			accounts,
			showAccountConfirmation,
			detectedAccount: showAccountConfirmation
				? {
						accountType: detectedAccountType,
						accountNumber: detectedAccountNumber,
						bankId: detectedBankId
					}
				: null
		};
	}

	return {
		sessionId: null,
		transactions: [],
		categories: [],
		existingBills: [],
		buckets: [],
		accounts,
		showAccountConfirmation: false,
		detectedAccount: null
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

		// --- Account detection from OFX metadata ---
		const rawAccountNumber = parseResult.accountNumber;
		const bankId = parseResult.bankId || null;
		// Store last 4 digits for display/matching
		const accountNumberLast4 = rawAccountNumber
			? rawAccountNumber.slice(-4)
			: null;

		// Map OFX account type to our enum
		let detectedAccountType: 'checking' | 'savings' | 'credit_card' = 'checking';
		if (parseResult.accountType === 'CREDIT_CARD') {
			detectedAccountType = 'credit_card';
		}
		// Note: OFX 'BANK' type could be checking or savings. Default to checking;
		// user can correct during account confirmation.

		// Try to match an existing account by bank info
		let matchedAccount = accountNumberLast4 && bankId
			? getAccountByBankInfo(accountNumberLast4, bankId)
			: null;

		// If no bank info match, try matching by last 4 alone across all accounts
		if (!matchedAccount && accountNumberLast4) {
			const allAccounts = getAllAccounts();
			matchedAccount = allAccounts.find(
				(a) => a.accountNumber === accountNumberLast4
			) || null;
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

		// Create import session (associate with account if matched)
		const session = createImportSession({
			fileName: file.name,
			fileType: fileName.endsWith('.qfx') ? 'qfx' : 'ofx',
			transactionCount: parseResult.transactions.length,
			importedCount: 0,
			skippedCount: skippedCount,
			status: 'pending',
			accountId: matchedAccount?.id ?? null
		});

		// Insert only non-duplicate transactions into database
		// All transactions surface to the review screen so the user can classify them.
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
			isIncome: false, // Never auto-classify; user decides during review
			isProcessed: false,
			ownerAccountId: matchedAccount?.id ?? null,
			isPotentialTransfer: txn.transactionType === 'XFER'
		}));

				createImportedTransactionsBatch(transactionData);
			}

		// If account was matched, go straight to review
		// If not, redirect with newAccount flag so user can name the account
		if (matchedAccount) {
			throw redirect(302, `/import?session=${session.id}`);
		} else {
			// Build redirect with detected account info for the confirmation step
			const params = new URLSearchParams({
				session: session.id.toString(),
				newAccount: 'true'
			});
			if (detectedAccountType) params.set('accountType', detectedAccountType);
			if (accountNumberLast4) params.set('accountNumber', accountNumberLast4);
			if (bankId) params.set('bankId', bankId);
			throw redirect(302, `/import?${params.toString()}`);
		}
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
					refundedBucketId,
					refundedBillId
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

					// Default recurrenceType to 'monthly' when isRecurring is true but no type provided
					const effectiveRecurrenceType = isRecurring ? (recurrenceType || 'monthly') : null;

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
								recurrenceType: effectiveRecurrenceType,
								recurrenceDay: (isRecurring && (effectiveRecurrenceType === 'monthly' || effectiveRecurrenceType === 'quarterly')) ? utcDateToLocal(billDueDate).getDate() : null,
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
							? { isRecurring, recurrenceType: effectiveRecurrenceType, recurrenceDay: utcDateToLocal(billDueDate).getDate() }
							: existingBills.find(b => b.id === billIdToUse);

						if (billToUpdate?.isRecurring && billToUpdate.recurrenceType) {
							const nextDueDate = calculateNextDueDate(
								billDueDate,
								billToUpdate.recurrenceType as any,
								billToUpdate.recurrenceDay || utcDateToLocal(billDueDate).getDate()
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
		} else if (action === 'mark_income' && transactionData) {
					// Mark as income — no further mapping needed
					updateImportedTransaction(transactionId, {
						isIncome: true,
						isProcessed: true
					});
					importedCount++;
				} else if (action === 'mark_refund' && transactionData) {
					// A refund credits back a bucket or bill, reducing what was spent
					if (refundedBucketId) {
						// Create a negative-amount bucket transaction to reduce totalSpent
						await createTransaction({
							bucketId: refundedBucketId,
							amount: -Math.abs(transactionData.transaction.amount),
							timestamp: transactionData.transaction.datePosted,
							vendor: transactionData.transaction.payee,
							notes: `Refund: ${transactionData.transaction.memo || transactionData.transaction.payee}`
						});

						updateImportedTransaction(transactionId, {
							isRefund: true,
							refundedBucketId,
							mappedBucketId: refundedBucketId,
							isProcessed: true
						});
						importedCount++;
					} else if (refundedBillId) {
						// Create a negative-amount bill payment to reduce totalPaid
						await createPayment({
							billId: refundedBillId,
							amount: -Math.abs(transactionData.transaction.amount),
							paymentDate: transactionData.transaction.datePosted,
							notes: `Refund: ${transactionData.transaction.memo || transactionData.transaction.payee}`
						});

						updateImportedTransaction(transactionId, {
							isRefund: true,
							refundedBillId,
							mappedBillId: refundedBillId,
							isProcessed: true
						});
						importedCount++;
					}
				}
				// If action is 'skip', we just don't process it
				// Handle mark_transfer action
				if (action === 'mark_transfer' && transactionData) {
					const { counterpartyAccountId } = mapping;
					if (counterpartyAccountId) {
						const linked = findAndLinkTransferMatch(transactionId, counterpartyAccountId);
						if (!linked) {
							// No unique match found — mark just this side
							updateImportedTransaction(transactionId, {
								isTransfer: true,
								counterpartyAccountId: counterpartyAccountId,
								isProcessed: true
							});
						}
						// If linked, findAndLinkTransferMatch already marked both sides
					} else {
						updateImportedTransaction(transactionId, {
							isTransfer: true,
							counterpartyAccountId: null,
							isProcessed: true
						});
					}
					importedCount++;
				}
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

			// Auto-scan for potential transfers after import completes
			const session = getImportSession(sessionId);
			if (session?.accountId) {
				const potentialTransfers = detectPotentialTransfers(session.accountId, sessionId);
				if (potentialTransfers.length > 0) {
					// Redirect to accounts page with transfer review flag
					throw redirect(302, '/accounts?reviewTransfers=true');
				}
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
	},

	confirmAccount: async ({ request }) => {
		try {
			const formData = await request.formData();
			const sessionId = parseInt(formData.get('sessionId') as string);
			const accountName = (formData.get('accountName') as string)?.trim();
			const accountType = (formData.get('accountType') as string) || 'checking';
			const accountNumber = formData.get('accountNumber') as string | null;
			const bankId = formData.get('bankId') as string | null;
			const initialBalance = parseFloat(formData.get('initialBalance') as string) || 0;

			if (!accountName) {
				return fail(400, { error: 'Account name is required' });
			}

			// Create the new account
			const account = createAccount({
				name: accountName,
				accountType: accountType as 'checking' | 'savings' | 'credit_card',
				accountNumber: accountNumber || null,
				bankId: bankId || null,
				initialBalance,
				isExternal: false
			});

			// Associate the session with the new account
			const { updateImportSession } = await import('$lib/server/db/queries');
			updateImportSession(sessionId, { accountId: account.id });

			// Associate all transactions in this session with the new account
			const sessionTransactions = getImportedTransactionsBySession(sessionId);
			for (const { transaction } of sessionTransactions) {
				updateImportedTransaction(transaction.id, {
					ownerAccountId: account.id
				});
			}

			// Redirect to review page (without newAccount flag)
			throw redirect(302, `/import?session=${sessionId}`);
		} catch (error) {
			if (error && typeof error === 'object' && 'status' in error && 'location' in error) {
				throw error;
			}

			console.error('Confirm account error:', error);
			return fail(500, {
				error: 'Failed to create account'
			});
		}
	}
};
