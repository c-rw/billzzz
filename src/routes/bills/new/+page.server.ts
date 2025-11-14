import type { PageServerLoad, Actions } from './$types';
import { getAllCategories, createBill } from '$lib/server/db/queries';
import { redirect } from '@sveltejs/kit';
import type { NewBill } from '$lib/server/db/schema';

export const load: PageServerLoad = async () => {
	const categories = getAllCategories();
	return { categories };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const data = Object.fromEntries(formData);

		const newBill: NewBill = {
			name: data.name as string,
			amount: parseFloat(data.amount as string),
			dueDate: new Date(data.dueDate as string),
			paymentLink: (data.paymentLink as string) || null,
			categoryId: data.categoryId ? parseInt(data.categoryId as string) : null,
			isRecurring: data.isRecurring === 'true',
			recurrenceType: (data.recurrenceType as any) || null,
			recurrenceDay: data.recurrenceDay ? parseInt(data.recurrenceDay as string) : null,
			isPaid: false,
			notes: (data.notes as string) || null
		};

		createBill(newBill);

		throw redirect(303, '/');
	}
};
