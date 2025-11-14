import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getAllCategories, createCategory } from '$lib/server/db/queries';

// GET /api/categories - Get all categories
export const GET: RequestHandler = async () => {
	try {
		const categories = getAllCategories();
		return json(categories);
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Failed to fetch categories' }, { status: 500 });
	}
};

// POST /api/categories - Create a new category
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		const newCategory = {
			name: data.name,
			color: data.color,
			icon: data.icon || null
		};

		const category = createCategory(newCategory);
		return json(category);
	} catch (error) {
		console.error('Error creating category:', error);
		return json({ error: 'Failed to create category' }, { status: 500 });
	}
};
