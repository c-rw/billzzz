import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
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

	// Initialize tables if they don't exist
	sqlite.exec(`
	CREATE TABLE IF NOT EXISTS categories (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL UNIQUE,
		color TEXT NOT NULL,
		icon TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS bills (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		amount REAL NOT NULL,
		due_date INTEGER NOT NULL,
		payment_link TEXT,
		category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
		is_recurring INTEGER NOT NULL DEFAULT 0,
		recurrence_type TEXT CHECK(recurrence_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
		recurrence_day INTEGER,
		is_paid INTEGER NOT NULL DEFAULT 0,
		is_autopay INTEGER NOT NULL DEFAULT 0,
		notes TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS payment_history (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
		amount REAL NOT NULL,
		payment_date INTEGER NOT NULL,
		notes TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS payday_settings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		frequency TEXT NOT NULL CHECK(frequency IN ('weekly', 'biweekly', 'semi-monthly', 'monthly')),
		day_of_week INTEGER,
		day_of_month INTEGER,
		day_of_month_2 INTEGER,
		start_date INTEGER,
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS debts (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		name TEXT NOT NULL,
		original_balance REAL NOT NULL,
		current_balance REAL NOT NULL,
		interest_rate REAL NOT NULL,
		minimum_payment REAL NOT NULL,
		linked_bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
		priority INTEGER,
		payment_allocation_strategy TEXT DEFAULT 'highest-rate-first' CHECK(payment_allocation_strategy IN ('lowest-rate-first', 'highest-rate-first', 'oldest-first')),
		notes TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS debt_rate_buckets (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		balance REAL NOT NULL,
		interest_rate REAL NOT NULL,
		start_date INTEGER NOT NULL,
		expires_date INTEGER,
		is_retroactive INTEGER NOT NULL DEFAULT 0,
		retroactive_rate REAL,
		category TEXT NOT NULL DEFAULT 'purchase' CHECK(category IN ('purchase', 'balance-transfer', 'cash-advance', 'other')),
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS debt_payments (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		debt_id INTEGER NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
		amount REAL NOT NULL,
		payment_date INTEGER NOT NULL,
		notes TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch())
	);

	CREATE TABLE IF NOT EXISTS debt_strategy_settings (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		strategy TEXT NOT NULL DEFAULT 'snowball' CHECK(strategy IN ('snowball', 'avalanche', 'custom')),
		extra_monthly_payment REAL NOT NULL DEFAULT 0,
		custom_priority_order TEXT,
		created_at INTEGER NOT NULL DEFAULT (unixepoch()),
		updated_at INTEGER NOT NULL DEFAULT (unixepoch())
	);
	`);

	// Run migrations for existing databases
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
