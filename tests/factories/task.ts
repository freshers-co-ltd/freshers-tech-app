export interface CleaningTask {
	id: string;
	cleaning_id: string;
	description: string;
	is_completed: boolean;
	is_custom: boolean;
	created_at: string;
	deleted_at: string | null;
}

export function buildCleaningTask(overrides?: Partial<CleaningTask>): CleaningTask {
	return {
		id: 'task_123',
		cleaning_id: 'cleaning_123',
		description: 'Vacuum all rooms',
		is_completed: false,
		is_custom: false,
		created_at: new Date().toISOString(),
		deleted_at: null,
		...overrides,
	};
}

export interface StandardTask {
	id: string;
	description: string;
	is_active: boolean;
	created_at: string;
}

export function buildStandardTask(overrides?: Partial<StandardTask>): StandardTask {
	return {
		id: 'std_task_123',
		description: 'Standard cleaning task',
		is_active: true,
		created_at: new Date().toISOString(),
		...overrides,
	};
}
