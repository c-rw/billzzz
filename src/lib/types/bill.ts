import type { Bill, Category, BillCycle, BillPayment } from '$lib/server/db/schema';

export type RecurrenceType = 'weekly' | 'biweekly' | 'semi-monthly' | 'monthly' | 'quarterly' | 'semi-annual' | 'yearly';

// Extended bill type with category details
export interface BillWithCategory extends Bill {
	category?: Category | null;
	linkedDebtId?: number | null;
}

// Bill cycle with computed fields
export interface BillCycleWithComputed extends BillCycle {
	startingBalance: number;
	remaining: number;
	percentPaid: number;
}

// Bill with current cycle information
export interface BillWithCycle extends Bill {
	currentCycle?: BillCycleWithComputed | null;
	linkedDebtId?: number | null;
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

// Export database types
export type { Bill, Category, BillCycle, BillPayment };
