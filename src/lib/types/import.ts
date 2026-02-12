export type MappingAction =
	| 'map_existing'
	| 'create_new'
	| 'map_to_bucket'
	| 'create_new_bucket'
	| 'mark_transfer'
	| 'mark_income'
	| 'mark_refund'
	| 'skip';
