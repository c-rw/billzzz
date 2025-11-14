import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getCategoryById, updateCategory, deleteCategory } from '$lib/server/db/queries';

// GET /api/categories/[id] - Get a single category
export const GET: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const category = getCategoryById(id);

		if (!category) {
			return json({ error: 'Category not found' }, { status: 404 });
		}

		return json(category);
	} catch (error) {
		console.error('Error fetching category:', error);
		return json({ error: 'Failed to fetch category' }, { status: 500 });
	}
};

// PUT /api/categories/[id] - Update a category
export const PUT: RequestHandler = async ({ params, request }) => {
	try {
		const id = parseInt(params.id);
		const data = await request.json();

		const updateData: any = {
			name: data.name,
			color: data.color,
			icon: data.icon
		};

		// Remove undefined values
		Object.keys(updateData).forEach(
			(key) => updateData[key] === undefined && delete updateData[key]
		);

		const category = updateCategory(id, updateData);

		if (!category) {
			return json({ error: 'Category not found' }, { status: 404 });
		}

		return json(category);
	} catch (error) {
		console.error('Error updating category:', error);
		return json({ error: 'Failed to update category' }, { status: 500 });
	}
};

// DELETE /api/categories/[id] - Delete a category
export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const id = parseInt(params.id);
		const category = deleteCategory(id);

		if (!category) {
			return json({ error: 'Category not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting category:', error);
		return json({ error: 'Failed to delete category' }, { status: 500 });
	}
};
