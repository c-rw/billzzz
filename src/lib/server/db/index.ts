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
			.prepare(
				"SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='__drizzle_migrations'"
			)
			.get() as { count: number };

		// Check if business tables exist
		const billsTableExists = sqlite
			.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='bills'")
			.get() as { count: number };

		const accountsTableExists = sqlite
			.prepare("SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name='accounts'")
			.get() as { count: number };

		// Decide whether to run migrations
		let shouldRunMigrations = false;

		if (migrationTableExists.count === 0) {
			// Migration tracking doesn't exist; if tables already exist, skip to avoid conflicts
			if (billsTableExists.count > 0 && accountsTableExists.count > 0) {
				console.log(
					'Database tables already exist but migration metadata is missing. Skipping migrations to prevent conflicts.'
				);
				shouldRunMigrations = false;
			} else {
				shouldRunMigrations = true;
			}
		} else if (billsTableExists.count === 0) {
			// Migration table exists but no business tables - run migrations
			shouldRunMigrations = true;
		} else {
			// Both migration table and business tables exist - check if migrations are complete
			const migrationCount = sqlite
				.prepare('SELECT COUNT(*) as count FROM __drizzle_migrations')
				.get() as { count: number };

			if (migrationCount.count === 0 && billsTableExists.count > 0 && accountsTableExists.count > 0) {
				console.log(
					'Database tables already exist but migration metadata is empty. Skipping migrations to prevent conflicts.'
				);
				shouldRunMigrations = false;
			} else {
				// Run migrations to catch any new ones
				shouldRunMigrations = true;
			}
		}

		if (shouldRunMigrations) {
			// Temporarily disable FK enforcement so migrations can rename/drop tables
			// that have FK references. PRAGMA foreign_keys cannot be changed inside a
			// transaction, so it must be set here (outside Drizzle's transaction).
			sqlite.pragma('foreign_keys = OFF');
			try {
				migrate(drizzleDb, { migrationsFolder: join(process.cwd(), 'drizzle', 'migrations') });
				console.log('Database migrations completed successfully');
			} finally {
				sqlite.pragma('foreign_keys = ON');
			}
		}
	} catch (error) {
		console.error('Migration error:', error);
		throw error;
	}

	// Fix FK references corrupted by the initial 0014 migration (RENAME strategy).
	// SQLite 3.26+ auto-updated FK refs in non-migrated tables to point at _old_*
	// tables that were then dropped. Only runs if corruption is detected.
	try {
		const debtsSchema = sqlite.prepare("SELECT sql FROM sqlite_master WHERE name='debts'").get() as { sql: string } | undefined;
		if (debtsSchema?.sql?.includes('_old_')) {
			console.log('Detected corrupted FK references from 0014 migration, repairing...');
			sqlite.pragma('foreign_keys = OFF');
			try {
				sqlite.exec('BEGIN');

				// Get actual column lists from each table so we copy exactly what exists
				const getColumns = (table: string) => {
					const info = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
					return info.map(c => `\`${c.name}\``).join(', ');
				};

				// debts
				const debtsCols = getColumns('debts');
				sqlite.exec(`CREATE TABLE \`_fix_debts\` (
					\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					\`name\` text NOT NULL, \`original_balance\` real NOT NULL,
					\`current_balance\` real NOT NULL, \`interest_rate\` real NOT NULL,
					\`minimum_payment\` real NOT NULL,
					\`linked_bill_id\` integer REFERENCES \`bills\`(\`id\`) ON DELETE set null,
					\`priority\` integer, \`notes\` text,
					\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
					\`updated_at\` integer DEFAULT (unixepoch()) NOT NULL,
					\`payment_allocation_strategy\` text DEFAULT 'highest-rate-first'
				)`);
				sqlite.exec(`INSERT INTO \`_fix_debts\` (${debtsCols}) SELECT ${debtsCols} FROM \`debts\``);
				sqlite.exec('DROP TABLE `debts`');
				sqlite.exec('ALTER TABLE `_fix_debts` RENAME TO `debts`');

				// import_sessions
				const isCols = getColumns('import_sessions');
				sqlite.exec(`CREATE TABLE \`_fix_import_sessions\` (
					\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					\`file_name\` text NOT NULL, \`file_type\` text NOT NULL,
					\`transaction_count\` integer NOT NULL,
					\`imported_count\` integer DEFAULT 0 NOT NULL,
					\`skipped_count\` integer DEFAULT 0 NOT NULL,
					\`account_id\` integer REFERENCES \`accounts\`(\`id\`) ON DELETE set null,
					\`status\` text DEFAULT 'pending' NOT NULL,
					\`created_at\` integer DEFAULT (unixepoch()) NOT NULL
				)`);
				sqlite.exec(`INSERT INTO \`_fix_import_sessions\` (${isCols}) SELECT ${isCols} FROM \`import_sessions\``);
				sqlite.exec('DROP TABLE `import_sessions`');
				sqlite.exec('ALTER TABLE `_fix_import_sessions` RENAME TO `import_sessions`');

				// imported_transactions
				const itCols = getColumns('imported_transactions');
				sqlite.exec(`CREATE TABLE \`_fix_imported_transactions\` (
					\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					\`session_id\` integer NOT NULL REFERENCES \`import_sessions\`(\`id\`) ON DELETE cascade,
					\`fit_id\` text NOT NULL, \`transaction_type\` text NOT NULL,
					\`date_posted\` integer NOT NULL, \`amount\` real NOT NULL,
					\`payee\` text NOT NULL, \`memo\` text, \`check_number\` text,
					\`mapped_bill_id\` integer REFERENCES \`bills\`(\`id\`) ON DELETE set null,
					\`create_new_bill\` integer DEFAULT false,
					\`suggested_category_id\` integer REFERENCES \`categories\`(\`id\`) ON DELETE set null,
					\`is_recurring_candidate\` integer DEFAULT false,
					\`recurrence_pattern\` text,
					\`is_processed\` integer DEFAULT false NOT NULL,
					\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
					\`mapped_bucket_id\` integer REFERENCES \`buckets\`(\`id\`) ON DELETE set null,
					\`is_income\` integer DEFAULT false NOT NULL,
					\`is_transfer\` integer DEFAULT false NOT NULL,
					\`counterparty_account_id\` integer REFERENCES \`accounts\`(\`id\`),
					\`transfer_category_id\` integer,
					\`owner_account_id\` integer REFERENCES \`accounts\`(\`id\`) ON DELETE set null,
					\`is_potential_transfer\` integer DEFAULT false NOT NULL,
					\`is_refund\` integer DEFAULT false NOT NULL,
					\`refunded_bucket_id\` integer REFERENCES \`buckets\`(\`id\`) ON DELETE set null,
					\`refunded_bill_id\` integer REFERENCES \`bills\`(\`id\`) ON DELETE set null
				)`);
				sqlite.exec(`INSERT INTO \`_fix_imported_transactions\` (${itCols}) SELECT ${itCols} FROM \`imported_transactions\``);
				sqlite.exec('DROP TABLE `imported_transactions`');
				sqlite.exec('ALTER TABLE `_fix_imported_transactions` RENAME TO `imported_transactions`');

				// transfers
				const trCols = getColumns('transfers');
				sqlite.exec(`CREATE TABLE \`_fix_transfers\` (
					\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					\`from_transaction_id\` integer NOT NULL REFERENCES \`imported_transactions\`(\`id\`) ON DELETE cascade,
					\`to_transaction_id\` integer NOT NULL REFERENCES \`imported_transactions\`(\`id\`) ON DELETE cascade,
					\`from_account_id\` integer NOT NULL REFERENCES \`accounts\`(\`id\`) ON DELETE cascade,
					\`to_account_id\` integer NOT NULL REFERENCES \`accounts\`(\`id\`) ON DELETE cascade,
					\`amount\` real NOT NULL,
					\`status\` text DEFAULT 'pending' NOT NULL,
					\`detected_at\` integer DEFAULT (unixepoch()) NOT NULL,
					\`confirmed_at\` integer
				)`);
				sqlite.exec(`INSERT INTO \`_fix_transfers\` (${trCols}) SELECT ${trCols} FROM \`transfers\``);
				sqlite.exec('DROP TABLE `transfers`');
				sqlite.exec('ALTER TABLE `_fix_transfers` RENAME TO `transfers`');

				// bucket_transactions
				const btCols = getColumns('bucket_transactions');
				sqlite.exec(`CREATE TABLE \`_fix_bucket_transactions\` (
					\`id\` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
					\`bucket_id\` integer NOT NULL REFERENCES \`buckets\`(\`id\`) ON DELETE cascade,
					\`cycle_id\` integer NOT NULL REFERENCES \`bucket_cycles\`(\`id\`) ON DELETE cascade,
					\`amount\` real NOT NULL, \`timestamp\` integer NOT NULL,
					\`vendor\` text, \`notes\` text,
					\`created_at\` integer DEFAULT (unixepoch()) NOT NULL,
					\`updated_at\` integer DEFAULT (unixepoch()) NOT NULL
				)`);
				sqlite.exec(`INSERT INTO \`_fix_bucket_transactions\` (${btCols}) SELECT ${btCols} FROM \`bucket_transactions\``);
				sqlite.exec('DROP TABLE `bucket_transactions`');
				sqlite.exec('ALTER TABLE `_fix_bucket_transactions` RENAME TO `bucket_transactions`');

				sqlite.exec('COMMIT');
				console.log('FK references repaired successfully');
			} catch (fkError) {
				sqlite.exec('ROLLBACK');
				throw fkError;
			} finally {
				sqlite.pragma('foreign_keys = ON');
			}
		}
	} catch (error) {
		console.error('FK repair error:', error);
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

	// Check if is_refund column exists in imported_transactions table
	const hasIsRefund = importedTxnColumns.some(col => col.name === 'is_refund');
	if (!hasIsRefund) {
		sqlite.exec('ALTER TABLE imported_transactions ADD COLUMN is_refund INTEGER NOT NULL DEFAULT 0');
		sqlite.exec('ALTER TABLE imported_transactions ADD COLUMN refunded_bucket_id INTEGER REFERENCES buckets(id) ON DELETE SET NULL');
		sqlite.exec('ALTER TABLE imported_transactions ADD COLUMN refunded_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL');
		console.log('Added refund columns to imported_transactions table');
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

	// Ensure a default "Primary" account exists and assign orphaned transactions
	try {
		const accountCount = sqlite
			.prepare('SELECT COUNT(*) as count FROM accounts')
			.get() as { count: number };

		if (accountCount.count === 0) {
			sqlite.exec(
				"INSERT INTO accounts (name, account_type, is_external, initial_balance, created_at, updated_at) VALUES ('Primary', 'checking', 0, 0, unixepoch(), unixepoch())"
			);
			const primaryAccount = sqlite
				.prepare("SELECT id FROM accounts WHERE name = 'Primary'")
				.get() as { id: number };
			console.log(`Created default "Primary" account (id: ${primaryAccount.id})`);

			// Assign all existing transactions with no account to the Primary account
			const updated = sqlite
				.prepare('UPDATE imported_transactions SET owner_account_id = ? WHERE owner_account_id IS NULL')
				.run(primaryAccount.id);

			if (updated.changes > 0) {
				console.log(`Assigned ${updated.changes} orphaned transactions to Primary account`);
			}

			// Also assign import sessions with no account
			const sessionsUpdated = sqlite
				.prepare('UPDATE import_sessions SET account_id = ? WHERE account_id IS NULL')
				.run(primaryAccount.id);

			if (sessionsUpdated.changes > 0) {
				console.log(`Assigned ${sessionsUpdated.changes} orphaned import sessions to Primary account`);
			}
		}
	} catch (error) {
		console.error('Default account creation error:', error);
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
