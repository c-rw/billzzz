import {
	ShoppingCart,
	Fuel,
	Utensils,
	Coffee,
	Popcorn,
	Dumbbell,
	Gamepad2,
	Smartphone,
	Shirt,
	Home,
	Dog,
	Heart,
	Landmark,
	PiggyBank,
	CreditCard
} from 'lucide-svelte';

/**
 * Ordered list of icon options for bucket / category icon pickers.
 */
export const bucketIconOptions: Array<{ id: string; component: any; label: string }> = [
	{ id: 'shopping-cart', component: ShoppingCart, label: 'Groceries' },
	{ id: 'fuel', component: Fuel, label: 'Gas' },
	{ id: 'utensils', component: Utensils, label: 'Food' },
	{ id: 'coffee', component: Coffee, label: 'Coffee' },
	{ id: 'popcorn', component: Popcorn, label: 'Entertainment' },
	{ id: 'dumbbell', component: Dumbbell, label: 'Fitness' },
	{ id: 'gamepad', component: Gamepad2, label: 'Gaming' },
	{ id: 'smartphone', component: Smartphone, label: 'Tech' },
	{ id: 'shirt', component: Shirt, label: 'Clothing' },
	{ id: 'home', component: Home, label: 'Home' },
	{ id: 'dog', component: Dog, label: 'Pets' },
	{ id: 'heart', component: Heart, label: 'Health' }
];

/**
 * Maps bucket icon IDs to their Lucide component constructors.
 * Used in BucketCard, BucketHeader, and the settings category form.
 */
export const bucketIconMap: Record<string, any> = Object.fromEntries(
	bucketIconOptions.map(({ id, component }) => [id, component])
);

/**
 * Maps account type strings to their Lucide icon components.
 */
export const accountTypeIcon: Record<string, any> = {
	checking: Landmark,
	savings: PiggyBank,
	credit_card: CreditCard
};
