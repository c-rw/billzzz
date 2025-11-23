import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getUserPreferences,
	updateUserPreferences,
	getOrCreateUserPreferences
} from '$lib/server/db/preference-queries';

// GET /api/preferences - Get user preferences
export const GET: RequestHandler = async () => {
	try {
		const preferences = getOrCreateUserPreferences();
		return json(preferences);
	} catch (error) {
		console.error('Error fetching user preferences:', error);
		return json({ error: 'Failed to fetch user preferences' }, { status: 500 });
	}
};

// PUT /api/preferences - Update user preferences
export const PUT: RequestHandler = async ({ request }) => {
	try {
		const data = await request.json();

		// Validate theme preference if provided
		if (data.themePreference && !['light', 'dark', 'system'].includes(data.themePreference)) {
			return json(
				{ error: 'Invalid theme preference. Must be "light", "dark", or "system"' },
				{ status: 400 }
			);
		}

		// Get or create preferences
		const existing = getOrCreateUserPreferences();

		// Update preferences
		const updated = updateUserPreferences(existing.id, {
			themePreference: data.themePreference
		});

		return json(updated);
	} catch (error) {
		console.error('Error updating user preferences:', error);
		return json({ error: 'Failed to update user preferences' }, { status: 500 });
	}
};
