'use client';

import type {
	CleaningTask,
	StandardTask,
	TaskInsert,
	TaskUpdate,
} from '@/features/cleanings/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const tasksService = {
	async getStandardTasks(): Promise<ActionResult<StandardTask[]>> {
		const { data, error } = await supabase
			.from('standard_tasks')
			.select('id, description, is_active, created_at')
			.order('is_active', { ascending: false })
			.order('created_at', { ascending: true });

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data ?? [], error: null };
	},

	async insertTask(payload: TaskInsert): Promise<ActionResult<CleaningTask>> {
		const { data, error } = await supabase.from('cleaning_tasks').insert(payload).select().single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async updateTask(payload: TaskUpdate): Promise<ActionResult<CleaningTask>> {
		if (!payload.id) {
			return { data: null, error: 'Task ID is required for updates' };
		}

		const { data, error } = await supabase
			.from('cleaning_tasks')
			.update({ is_completed: payload.is_completed })
			.eq('id', payload.id)
			.select()
			.single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data, error: null };
	},

	async softDeleteTask(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_cleaning_task', {
			p_task_id: id,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async hardDeleteTask(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.from('cleaning_tasks').delete().eq('id', id);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},
};
