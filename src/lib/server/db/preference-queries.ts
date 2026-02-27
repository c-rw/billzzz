import { db } from './index';
import { userPreferences } from './schema';
import type { UserPreferences, NewUserPreferences } from './schema';
import { eq } from 'drizzle-orm';

/**
 * Get user preferences (returns first row since we only have one user)
 */
export function getUserPreferences(): UserPreferences | undefined {
	const result = db.select().from(userPreferences).limit(1).all();
	return result[0];
}

/**
 * Create user preferences
 */
function createUserPreferences(data: NewUserPreferences): UserPreferences {
	const result = db.insert(userPreferences).values(data).returning().get();
	return result;
}

/**
 * Update user preferences
 */
export function updateUserPreferences(
	id: number,
	data: Partial<NewUserPreferences>
): UserPreferences {
	const result = db
		.update(userPreferences)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(userPreferences.id, id))
		.returning()
		.get();
	return result;
}

/**
 * Get or create user preferences (convenience function)
 */
export function getOrCreateUserPreferences(): UserPreferences {
	const existing = getUserPreferences();
	if (existing) {
		return existing;
	}

	// Create with default values
	return createUserPreferences({
		themePreference: 'system'
	});
}
