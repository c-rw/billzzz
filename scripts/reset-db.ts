import Database from 'better-sqlite3';
import { existsSync, unlinkSync, mkdirSync } from 'fs';
import { dirname } from 'path';

const dbPath = './data/bills.db';

console.log('🗑️  Resetting database...\n');

// Remove existing database if it exists
if (existsSync(dbPath)) {
	unlinkSync(dbPath);
	console.log('✓ Removed existing database');
}

// Remove WAL files if they exist
if (existsSync(`${dbPath}-wal`)) {
	unlinkSync(`${dbPath}-wal`);
	console.log('✓ Removed WAL file');
}

if (existsSync(`${dbPath}-shm`)) {
	unlinkSync(`${dbPath}-shm`);
	console.log('✓ Removed SHM file');
}

// Ensure data directory exists
const dataDir = dirname(dbPath);
if (!existsSync(dataDir)) {
	mkdirSync(dataDir, { recursive: true });
	console.log('✓ Created data directory');
}

// Create fresh database
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
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
		recurrence_type TEXT CHECK(recurrence_type IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'semi-annual', 'yearly')),
		recurrence_day INTEGER,
		is_paid INTEGER NOT NULL DEFAULT 0,
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
`);

console.log('✓ Created database schema');

db.close();

console.log('\n✅ Database reset complete!\n');
