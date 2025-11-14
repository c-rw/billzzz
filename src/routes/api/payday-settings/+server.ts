import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPaydaySettings, createPaydaySettings, updatePaydaySettings, deletePaydaySettings } from '$lib/server/db/queries';
import type { NewPaydaySettings } from '$lib/server/db/schema';

// GET /api/payday-settings - Get payday settings
export const GET: RequestHandler = async () => {
	try {
		const settings = getPaydaySettings();
		return json(settings || null);
	} catch (error) {
		console.error('Error fetching payday settings:', error);
		return json({ error: 'Failed to fetch payday settings' }, { status: 500 });
	}
};

// POST /api/payday-settings - Create payday settings
export const POST: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate required fields
		if (!data.frequency) {
			return json({ error: 'Missing required field: frequency' }, { status: 400 });
		}

		// Check if settings already exist
		const existing = getPaydaySettings();
		if (existing) {
			return json({ error: 'Payday settings already exist. Use PUT to update.' }, { status: 400 });
		}

		const newSettings: NewPaydaySettings = {
			frequency: data.frequency,
			dayOfWeek: data.dayOfWeek || null,
			dayOfMonth: data.dayOfMonth || null,
			dayOfMonth2: data.dayOfMonth2 || null,
			startDate: data.startDate ? new Date(data.startDate) : null
		};

		const settings = createPaydaySettings(newSettings);
		return json(settings, { status: 201 });
	} catch (error) {
		console.error('Error creating payday settings:', error);
		return json({ error: 'Failed to create payday settings' }, { status: 500 });
	}
};

// PUT /api/payday-settings - Update payday settings
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Get existing settings
		const existing = getPaydaySettings();
		if (!existing) {
			return json({ error: 'Payday settings not found. Use POST to create.' }, { status: 404 });
		}

		const updateData: Partial<NewPaydaySettings> = {
			frequency: data.frequency,
			dayOfWeek: data.dayOfWeek || null,
			dayOfMonth: data.dayOfMonth || null,
			dayOfMonth2: data.dayOfMonth2 || null,
			startDate: data.startDate ? new Date(data.startDate) : null
		};

		// Remove undefined values
		Object.keys(updateData).forEach(
			(key) => updateData[key as keyof NewPaydaySettings] === undefined && delete updateData[key as keyof NewPaydaySettings]
		);

		const settings = updatePaydaySettings(existing.id, updateData);
		return json(settings);
	} catch (error) {
		console.error('Error updating payday settings:', error);
		return json({ error: 'Failed to update payday settings' }, { status: 500 });
	}
};

// DELETE /api/payday-settings - Delete payday settings
export const DELETE: RequestHandler = async () => {
	try {
		const existing = getPaydaySettings();
		if (!existing) {
			return json({ error: 'Payday settings not found' }, { status: 404 });
		}

		deletePaydaySettings(existing.id);
		return json({ success: true });
	} catch (error) {
		console.error('Error deleting payday settings:', error);
		return json({ error: 'Failed to delete payday settings' }, { status: 500 });
	}
};
