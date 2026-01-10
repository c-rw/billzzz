import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const categories = sqliteTable('categories', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	color: text('color').notNull(),
	icon: text('icon'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const bills = sqliteTable('bills', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	amount: real('amount').notNull(),
	dueDate: integer('due_date', { mode: 'timestamp' }).notNull(),
	paymentLink: text('payment_link'),
	categoryId: integer('category_id').references(() => categories.id, { onDelete: 'set null' }),
	isRecurring: integer('is_recurring', { mode: 'boolean' }).notNull().default(false),
	recurrenceType: text('recurrence_type', {
		enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
	}),
	recurrenceDay: integer('recurrence_day'),
	isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
	isAutopay: integer('is_autopay', { mode: 'boolean' }).notNull().default(false),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Bill cycles - generated periods for tracking billing periods
export const billCycles = sqliteTable('bill_cycles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	billId: integer('bill_id')
		.notNull()
		.references(() => bills.id, { onDelete: 'cascade' }),
	startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
	endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
	expectedAmount: real('expected_amount').notNull(), // Snapshot of bill amount when cycle created
	totalPaid: real('total_paid').notNull().default(0),
	isPaid: integer('is_paid', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Bill payments - payment transactions within billing cycles
export const billPayments = sqliteTable('bill_payments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	billId: integer('bill_id')
		.notNull()
		.references(() => bills.id, { onDelete: 'cascade' }),
	cycleId: integer('cycle_id')
		.notNull()
		.references(() => billCycles.id, { onDelete: 'cascade' }),
	amount: real('amount').notNull(),
	paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const paydaySettings = sqliteTable('payday_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	frequency: text('frequency', {
		enum: ['weekly', 'biweekly', 'semi-monthly', 'monthly']
	}).notNull(),
	dayOfWeek: integer('day_of_week'), // 0-6 for Sunday-Saturday (weekly/biweekly)
	dayOfMonth: integer('day_of_month'), // 1-31 (monthly/semi-monthly)
	dayOfMonth2: integer('day_of_month_2'), // Second day for semi-monthly
	startDate: integer('start_date', { mode: 'timestamp' }), // Reference date for biweekly
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const debts = sqliteTable('debts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	originalBalance: real('original_balance').notNull(),
	currentBalance: real('current_balance').notNull(),
	interestRate: real('interest_rate').notNull(), // APR as percentage (e.g., 15.5 for 15.5%)
	minimumPayment: real('minimum_payment').notNull(),
	linkedBillId: integer('linked_bill_id').references(() => bills.id, { onDelete: 'set null' }),
	priority: integer('priority'), // For custom ordering in hybrid strategy
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const debtPayments = sqliteTable('debt_payments', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	debtId: integer('debt_id')
		.notNull()
		.references(() => debts.id, { onDelete: 'cascade' }),
	amount: real('amount').notNull(),
	paymentDate: integer('payment_date', { mode: 'timestamp' }).notNull(),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const debtStrategySettings = sqliteTable('debt_strategy_settings', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	strategy: text('strategy', {
		enum: ['snowball', 'avalanche', 'custom']
	})
		.notNull()
		.default('snowball'),
	extraMonthlyPayment: real('extra_monthly_payment').notNull().default(0),
	customPriorityOrder: text('custom_priority_order'), // JSON array of debt IDs
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Type exports for use in application
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type Bill = typeof bills.$inferSelect;
export type NewBill = typeof bills.$inferInsert;

export type BillCycle = typeof billCycles.$inferSelect;
export type NewBillCycle = typeof billCycles.$inferInsert;

export type BillPayment = typeof billPayments.$inferSelect;
export type NewBillPayment = typeof billPayments.$inferInsert;

export type PaydaySettings = typeof paydaySettings.$inferSelect;
export type NewPaydaySettings = typeof paydaySettings.$inferInsert;

// Buckets for tracking variable spending categories
export const buckets = sqliteTable('buckets', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull(),
	frequency: text('frequency', {
		enum: ['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly']
	}).notNull(),
	budgetAmount: real('budget_amount').notNull(),
	enableCarryover: integer('enable_carryover', { mode: 'boolean' }).notNull().default(true),
	icon: text('icon'),
	color: text('color'),
	anchorDate: integer('anchor_date', { mode: 'timestamp' }).notNull(), // Reference date for cycle calculation
	isDeleted: integer('is_deleted', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Bucket cycles - generated periods for tracking spending
export const bucketCycles = sqliteTable('bucket_cycles', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bucketId: integer('bucket_id')
		.notNull()
		.references(() => buckets.id, { onDelete: 'cascade' }),
	startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
	endDate: integer('end_date', { mode: 'timestamp' }).notNull(),
	budgetAmount: real('budget_amount').notNull(), // Snapshot of budget at cycle creation
	carryoverAmount: real('carryover_amount').notNull().default(0),
	totalSpent: real('total_spent').notNull().default(0),
	isClosed: integer('is_closed', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

// Transactions within buckets
export const bucketTransactions = sqliteTable('bucket_transactions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	bucketId: integer('bucket_id')
		.notNull()
		.references(() => buckets.id, { onDelete: 'cascade' }),
	cycleId: integer('cycle_id')
		.notNull()
		.references(() => bucketCycles.id, { onDelete: 'cascade' }),
	amount: real('amount').notNull(),
	timestamp: integer('timestamp', { mode: 'timestamp' }).notNull(),
	vendor: text('vendor'),
	notes: text('notes'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type Bucket = typeof buckets.$inferSelect;
export type NewBucket = typeof buckets.$inferInsert;

export type BucketCycle = typeof bucketCycles.$inferSelect;
export type NewBucketCycle = typeof bucketCycles.$inferInsert;

export type BucketTransaction = typeof bucketTransactions.$inferSelect;
export type NewBucketTransaction = typeof bucketTransactions.$inferInsert;

export type Debt = typeof debts.$inferSelect;
export type NewDebt = typeof debts.$inferInsert;

export type DebtPayment = typeof debtPayments.$inferSelect;
export type NewDebtPayment = typeof debtPayments.$inferInsert;

export type DebtStrategySettings = typeof debtStrategySettings.$inferSelect;
export type NewDebtStrategySettings = typeof debtStrategySettings.$inferInsert;

// Import sessions - track OFX/QFX file imports
export const importSessions = sqliteTable('import_sessions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	fileName: text('file_name').notNull(),
	fileType: text('file_type', { enum: ['ofx', 'qfx'] }).notNull(),
	transactionCount: integer('transaction_count').notNull(),
	importedCount: integer('imported_count').notNull().default(0),
	skippedCount: integer('skipped_count').notNull().default(0),
	status: text('status', { enum: ['pending', 'completed', 'failed'] })
		.notNull()
		.default('pending'),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export const accounts = sqliteTable('accounts', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	name: text('name').notNull().unique(),
	isExternal: integer('is_external', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Imported transactions - temporary storage for OFX transactions before mapping
export const importedTransactions = sqliteTable('imported_transactions', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	sessionId: integer('session_id')
		.notNull()
		.references(() => importSessions.id, { onDelete: 'cascade' }),
	fitId: text('fit_id').notNull(), // Financial Institution Transaction ID
	transactionType: text('transaction_type').notNull(), // DEBIT, CREDIT, etc.
	datePosted: integer('date_posted', { mode: 'timestamp' }).notNull(),
	amount: real('amount').notNull(),
	payee: text('payee').notNull(),
	memo: text('memo'),
	checkNumber: text('check_number'),
	// Mapping fields
	mappedBillId: integer('mapped_bill_id').references(() => bills.id, { onDelete: 'set null' }),
	mappedBucketId: integer('mapped_bucket_id').references(() => buckets.id, {
		onDelete: 'set null'
	}),
	// Transfer fields (import-only)
	isTransfer: integer('is_transfer', { mode: 'boolean' }).notNull().default(false),
	counterpartyAccountId: integer('counterparty_account_id').references(() => accounts.id, {
		onDelete: 'set null'
	}),
	transferCategoryId: integer('transfer_category_id').references(() => categories.id, {
		onDelete: 'set null'
	}),
	createNewBill: integer('create_new_bill', { mode: 'boolean' }).default(false),
	suggestedCategoryId: integer('suggested_category_id').references(() => categories.id, {
		onDelete: 'set null'
	}),
	isRecurringCandidate: integer('is_recurring_candidate', { mode: 'boolean' }).default(false),
	recurrencePattern: text('recurrence_pattern'), // JSON with detected pattern info
	isIncome: integer('is_income', { mode: 'boolean' }).notNull().default(false),
	isProcessed: integer('is_processed', { mode: 'boolean' }).notNull().default(false),
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type ImportSession = typeof importSessions.$inferSelect;
export type NewImportSession = typeof importSessions.$inferInsert;

export type ImportedTransaction = typeof importedTransactions.$inferSelect;
export type NewImportedTransaction = typeof importedTransactions.$inferInsert;

// User preferences - stores app settings like theme preference
export const userPreferences = sqliteTable('user_preferences', {
	id: integer('id').primaryKey({ autoIncrement: true }),
	themePreference: text('theme_preference', { enum: ['light', 'dark', 'system'] })
		.notNull()
		.default('system'),
	expectedIncomeAmount: real('expected_income_amount'), // Expected income per paycheck for forecasting
	currentBalance: real('current_balance'), // Current account balance for cash flow projection
	lastBalanceUpdate: integer('last_balance_update', { mode: 'timestamp' }), // When balance was last updated
	createdAt: integer('created_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer('updated_at', { mode: 'timestamp' })
		.notNull()
		.default(sql`(unixepoch())`)
});

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;
