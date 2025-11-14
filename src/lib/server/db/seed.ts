import { db } from './index';
import { categories } from './schema';

const defaultCategories = [
	{ name: 'Utilities', color: '#3b82f6', icon: '⚡' },
	{ name: 'Rent/Mortgage', color: '#8b5cf6', icon: '🏠' },
	{ name: 'Subscriptions', color: '#ec4899', icon: '📺' },
	{ name: 'Insurance', color: '#10b981', icon: '🛡️' },
	{ name: 'Healthcare', color: '#f59e0b', icon: '🏥' },
	{ name: 'Entertainment', color: '#06b6d4', icon: '🎮' },
	{ name: 'Loans', color: '#ef4444', icon: '💳' },
	{ name: 'Other', color: '#6b7280', icon: '📋' }
];

export async function seedCategories() {
	try {
		// Check if categories already exist
		const existing = await db.select().from(categories);

		if (existing.length === 0) {
			await db.insert(categories).values(defaultCategories);
			console.log('✓ Default categories seeded successfully');
		} else {
			console.log('✓ Categories already exist, skipping seed');
		}
	} catch (error) {
		console.error('Error seeding categories:', error);
		throw error;
	}
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedCategories()
		.then(() => {
			console.log('Seed completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('Seed failed:', error);
			process.exit(1);
		});
}
