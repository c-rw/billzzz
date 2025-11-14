import { db } from './index';
import { bills, categories } from './schema';
import { addDays, addMonths } from 'date-fns';

async function seedBills() {
	try {
		// Get categories
		const allCategories = await db.select().from(categories);
		const utilitiesCategory = allCategories.find((c) => c.name === 'Utilities');
		const subscriptionsCategory = allCategories.find((c) => c.name === 'Subscriptions');
		const rentCategory = allCategories.find((c) => c.name === 'Rent/Mortgage');
		const insuranceCategory = allCategories.find((c) => c.name === 'Insurance');

		const sampleBills = [
			{
				name: 'Electric Bill',
				amount: 125.50,
				dueDate: addDays(new Date(), 5),
				paymentLink: 'https://example.com/electric',
				categoryId: utilitiesCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				recurrenceDay: 15,
				isPaid: false,
				notes: 'Monthly electricity payment'
			},
			{
				name: 'Netflix Subscription',
				amount: 15.99,
				dueDate: addDays(new Date(), 2),
				paymentLink: 'https://netflix.com',
				categoryId: subscriptionsCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				recurrenceDay: 1,
				isPaid: false,
				notes: 'Premium plan'
			},
			{
				name: 'Rent',
				amount: 1500.00,
				dueDate: addMonths(new Date(), 1),
				categoryId: rentCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				recurrenceDay: 1,
				isPaid: false,
				notes: 'Monthly rent payment'
			},
			{
				name: 'Car Insurance',
				amount: 89.00,
				dueDate: addDays(new Date(), -2),
				categoryId: insuranceCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				isPaid: false,
				notes: 'Auto insurance premium - OVERDUE'
			},
			{
				name: 'Internet Service',
				amount: 79.99,
				dueDate: addDays(new Date(), 10),
				paymentLink: 'https://example.com/isp',
				categoryId: utilitiesCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				isPaid: false,
				notes: 'Fiber optic 1Gbps'
			},
			{
				name: 'Spotify Premium',
				amount: 10.99,
				dueDate: addDays(new Date(), 1),
				categoryId: subscriptionsCategory?.id || null,
				isRecurring: true,
				recurrenceType: 'monthly' as const,
				isPaid: true,
				notes: 'Already paid this month'
			}
		];

		// Check if bills already exist
		const existing = await db.select().from(bills);

		if (existing.length === 0) {
			await db.insert(bills).values(sampleBills);
			console.log('✓ Sample bills seeded successfully');
		} else {
			console.log('✓ Bills already exist, skipping seed');
		}
	} catch (error) {
		console.error('Error seeding bills:', error);
		throw error;
	}
}

// Run seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
	seedBills()
		.then(() => {
			console.log('Seed completed');
			process.exit(0);
		})
		.catch((error) => {
			console.error('Seed failed:', error);
			process.exit(1);
		});
}

export { seedBills };
