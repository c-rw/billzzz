<script lang="ts">
	type MappingAction = 'map_existing' | 'create_new' | 'map_to_bucket' | 'create_new_bucket' | 'skip';

	let {
		index,
		selectedAction,
		onActionChange
	}: {
		index: number;
		selectedAction: MappingAction;
		onActionChange: (action: MappingAction) => void;
	} = $props();
</script>

<div class="grid grid-cols-3 gap-2">
	<label class="flex items-center">
		<input
			type="radio"
			name="action_{index}"
			value="map_existing"
			checked={selectedAction === 'map_existing'}
			onchange={() => onActionChange('map_existing')}
			class="mr-2"
		/>
		<span class="text-sm dark:text-gray-300">Map to Bill</span>
	</label>
	<label class="flex items-center">
		<input
			type="radio"
			name="action_{index}"
			value="create_new"
			checked={selectedAction === 'create_new'}
			onchange={() => onActionChange('create_new')}
			class="mr-2"
		/>
		<span class="text-sm dark:text-gray-300">Create New Bill</span>
	</label>
	<label class="flex items-center">
		<input
			type="radio"
			name="action_{index}"
			value="skip"
			checked={selectedAction === 'skip'}
			onchange={() => onActionChange('skip')}
			class="mr-2"
		/>
		<span class="text-sm dark:text-gray-300">Skip</span>
	</label>
	<label class="flex items-center">
		<input
			type="radio"
			name="action_{index}"
			value="map_to_bucket"
			checked={selectedAction === 'map_to_bucket'}
			onchange={() => onActionChange('map_to_bucket')}
			class="mr-2"
		/>
		<span class="text-sm dark:text-gray-300">Map to Bucket</span>
	</label>
	<label class="flex items-center">
		<input
			type="radio"
			name="action_{index}"
			value="create_new_bucket"
			checked={selectedAction === 'create_new_bucket'}
			onchange={() => onActionChange('create_new_bucket')}
			class="mr-2"
		/>
		<span class="text-sm dark:text-gray-300">Create New Bucket</span>
	</label>
</div>
