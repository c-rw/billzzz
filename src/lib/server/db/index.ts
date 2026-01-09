import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from './schema';
import { existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { building } from '$app/environment';

// Database path - use environment variable or default based on environment
const DATA_DIR = process.env.DATA_DIR || (process.env.NODE_ENV === 'production' ? '/app/data' : './data');
const dbPath = join(DATA_DIR, 'bills.db');

// Initialize database connection (skip during build)
let sqlite: Database.Database;
let isInitialized = false;

function initializeDatabase() {
	if (isInitialized || building) return;

	// Ensure data directory exists
	const dataDir = dirname(dbPath);
	if (!existsSync(dataDir)) {
		mkdirSync(dataDir, { recursive: true });
	}

	// Create SQLite database connection
	sqlite = new Database(dbPath);
	sqlite.pragma('journal_mode = WAL'); // Enable WAL mode for better concurrency
	sqlite.pragma('foreign_keys = ON'); // Enable foreign key constraints

	// Run Drizzle migrations
	try {
		const drizzleDb = drizzle(sqlite, { schema });

		// Check if migration metadata table exists
		const migrationTableExists = sqlite
			.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'")
			.get() as { count: number };

		// Check if business tables exist
		const tablesExist = sqlite
			.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='bills'")
			.get() as { count: number };

		// Decide whether to run migrations
		let shouldRunMigrations = false;

		if (migrationTableExists.count === 0) {
			// Migration table doesn't exist - need to run migrations
			shouldRunMigrations = true;
		} else if (tablesExist.count === 0) {
			// Migration table exists but no business tables - run migrations
			shouldRunMigrations = true;
		} else {
			// Both migration table and business tables exist - check if migrations are complete
			const migrationCount = sqlite
				.prepare("SELECT COUNT(*) as count FROM __drizzle_migrations")
				.get() as { count: number };

			if (migrationCount.count === 0) {
				// Tables exist but migration metadata is empty - skip to avoid conflicts
				console.log('Database tables already exist but migration metadata is empty. Skipping migrations to prevent conflicts.');
				shouldRunMigrations = false;
			} else {
				// Run migrations to catch any new ones
				shouldRunMigrations = true;
			}
		}

		if (shouldRunMigrations) {
			migrate(drizzleDb, { migrationsFolder: './drizzle/migrations' });
			console.log('Database migrations completed successfully');
		}
	} catch (error) {
		console.error('Migration error:', error);
		throw error;
	}

	// Run manual migrations for backwards compatibility with existing databases
	try {
	// Check if is_autopay column exists, if not add it
	const billColumns = sqlite.prepare("PRAGMA table_info(bills)").all() as Array<{ name: string }>;
	const hasAutopay = billColumns.some(col => col.name === 'is_autopay');

	if (!hasAutopay) {
		sqlite.exec('ALTER TABLE bills ADD COLUMN is_autopay INTEGER NOT NULL DEFAULT 0');
		console.log('Added is_autopay column to bills table');
	}

	// Check if payment_allocation_strategy column exists in debts table
	const debtColumns = sqlite.prepare("PRAGMA table_info(debts)").all() as Array<{ name: string }>;
	const hasPaymentAllocation = debtColumns.some(col => col.name === 'payment_allocation_strategy');

	if (!hasPaymentAllocation) {
		sqlite.exec("ALTER TABLE debts ADD COLUMN payment_allocation_strategy TEXT DEFAULT 'highest-rate-first' CHECK(payment_allocation_strategy IN ('lowest-rate-first', 'highest-rate-first', 'oldest-first'))");
		console.log('Added payment_allocation_strategy column to debts table');
	}

	// Check if is_income column exists in imported_transactions table
	const importedTxnColumns = sqlite.prepare("PRAGMA table_info(imported_transactions)").all() as Array<{ name: string }>;
	const hasIsIncome = importedTxnColumns.some(col => col.name === 'is_income');

	if (!hasIsIncome) {
		sqlite.exec('ALTER TABLE imported_transactions ADD COLUMN is_income INTEGER NOT NULL DEFAULT 0');
		console.log('Added is_income column to imported_transactions table');

		// Backfill existing CREDIT transactions as income
		sqlite.exec("UPDATE imported_transactions SET is_income = 1 WHERE transaction_type = 'CREDIT'");
		console.log('Backfilled existing CREDIT transactions as income');
	}

	// Fix orphaned transactions (both bills and buckets)
	// This can happen if bills/buckets were deleted before this fix was implemented
	const orphanedBillTxns = sqlite.prepare(
		"SELECT COUNT(*) as count FROM imported_transactions WHERE mapped_bill_id IS NULL AND mapped_bucket_id IS NULL AND is_processed = 1 AND is_income = 0"
	).get() as { count: number };

	if (orphanedBillTxns.count > 0) {
		sqlite.exec(
			"UPDATE imported_transactions SET is_processed = 0 WHERE mapped_bill_id IS NULL AND mapped_bucket_id IS NULL AND is_processed = 1 AND is_income = 0"
		);
		console.log(`Reset ${orphanedBillTxns.count} orphaned bill transactions to allow re-import`);
	}

	// Also check for transactions mapped to soft-deleted buckets
	const orphanedBucketTxns = sqlite.prepare(
		"SELECT COUNT(*) as count FROM imported_transactions it INNER JOIN buckets b ON it.mapped_bucket_id = b.id WHERE b.is_deleted = 1 AND it.is_processed = 1"
	).get() as { count: number };

	if (orphanedBucketTxns.count > 0) {
		sqlite.exec(
			"UPDATE imported_transactions SET is_processed = 0, mapped_bucket_id = NULL WHERE mapped_bucket_id IN (SELECT id FROM buckets WHERE is_deleted = 1) AND is_processed = 1"
		);
		console.log(`Reset ${orphanedBucketTxns.count} orphaned bucket transactions to allow re-import`);
	}

	// Check if analytics columns exist in user_preferences table
	const userPrefColumns = sqlite.prepare("PRAGMA table_info(user_preferences)").all() as Array<{ name: string }>;
	const hasExpectedIncome = userPrefColumns.some(col => col.name === 'expected_income_amount');
	const hasCurrentBalance = userPrefColumns.some(col => col.name === 'current_balance');
	const hasLastBalanceUpdate = userPrefColumns.some(col => col.name === 'last_balance_update');

	if (!hasExpectedIncome) {
		sqlite.exec('ALTER TABLE user_preferences ADD COLUMN expected_income_amount REAL');
		console.log('Added expected_income_amount column to user_preferences table');
	}

	if (!hasCurrentBalance) {
		sqlite.exec('ALTER TABLE user_preferences ADD COLUMN current_balance REAL');
		console.log('Added current_balance column to user_preferences table');
	}

	if (!hasLastBalanceUpdate) {
		sqlite.exec('ALTER TABLE user_preferences ADD COLUMN last_balance_update INTEGER');
		console.log('Added last_balance_update column to user_preferences table');
	}
	} catch (error) {
		console.error('Migration error:', error);
	}

	isInitialized = true;
}

// Get database instance (initializes on first access)
function getDb() {
	if (!isInitialized && !building) {
		initializeDatabase();
	}
	return drizzle(sqlite, { schema });
}

// Create Drizzle instance proxy that initializes on access
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
	get(_target, prop) {
		const dbInstance = getDb();
		return (dbInstance as any)[prop];
	}
});

// Export the raw sqlite instance for migrations if needed
export { sqlite };
