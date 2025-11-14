import type { Bill, Category, PaymentHistory } from '$lib/server/db/schema';

export type RecurrenceType = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export type BillStatus = 'paid' | 'upcoming' | 'overdue';

// Extended bill type with category details
export interface BillWithCategory extends Bill {
	category?: Category | null;
}

// Filter options for bills list
export interface BillFilters {
	status?: 'all' | 'paid' | 'unpaid' | 'overdue' | 'upcoming';
	categoryId?: number | null;
	searchQuery?: string;
}

// Sort options for bills list
export interface BillSort {
	field: 'dueDate' | 'amount' | 'name' | 'createdAt';
	direction: 'asc' | 'desc';
}

// Form data for creating/editing bills
export interface BillFormData {
	name: string;
	amount: number;
	dueDate: Date;
	paymentLink?: string;
	categoryId?: number | null;
	isRecurring: boolean;
	recurrenceType?: RecurrenceType;
	recurrenceDay?: number;
	isAutopay: boolean;
	notes?: string;
}

// Category form data
export interface CategoryFormData {
	name: string;
	color: string;
	icon?: string;
}

// Export database types
export type { Bill, Category, PaymentHistory };
