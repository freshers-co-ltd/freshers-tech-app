'use client';

import type { AdminCleaning, CleaningFilters, UpdateCleaningPayload } from '@/features/admin/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const cleaningService = {
	async getAllCleanings(
		filters: CleaningFilters = {},
		page = 1,
		limit = 20,
		sortField?: string,
		sortDirection: 'asc' | 'desc' = 'desc',
	): Promise<ActionResult<AdminCleaning[]>> {
		const { status, cleanerId, hostId, search, upcoming } = filters;

		const isUnassigned = cleanerId === 'unassigned';

		const { data, error } = await supabase.rpc('admin_get_all_cleanings', {
			p_status: (status ?? null) as string,
			p_cleaner_id: (isUnassigned ? null : (cleanerId ?? null)) as string,
			p_host_id: (hostId ?? null) as string,
			p_search: (search ?? null) as string,
			p_upcoming: upcoming ?? undefined,
			p_unassigned: isUnassigned ? true : null,
			p_page: page,
			p_limit: limit,
			p_sort_field: (sortField ?? null) as string,
			p_sort_direction: sortDirection,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as AdminCleaning[], error: null };
	},

	async getCleaningsCount(filters: CleaningFilters = {}): Promise<ActionResult<number>> {
		const { status, cleanerId, hostId, search, upcoming } = filters;

		const isUnassigned = cleanerId === 'unassigned';

		const { data, error } = await supabase.rpc('admin_get_cleanings_count', {
			p_status: (status ?? null) as string,
			p_cleaner_id: (isUnassigned ? null : (cleanerId ?? null)) as string,
			p_host_id: (hostId ?? null) as string,
			p_search: (search ?? null) as string,
			p_upcoming: upcoming ?? undefined,
			p_unassigned: isUnassigned ? true : null,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as number, error: null };
	},

	async assignCleaner(cleaningId: string, cleanerId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_assign_cleaner', {
			p_cleaning_id: cleaningId,
			p_cleaner_id: cleanerId,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async unassignCleaner(cleaningId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_unassign_cleaner', {
			p_cleaning_id: cleaningId,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async createCleaningForHost(
		hostId: string,
		propertyId: string,
		scheduledStart: string,
		options?: {
			information?: string;
			stocksIncluded?: boolean;
			customTasks?: string[];
		},
	): Promise<ActionResult<string>> {
		const { data, error } = await supabase.rpc('admin_create_cleaning_for_host', {
			p_host_id: hostId,
			p_property_id: propertyId,
			p_scheduled_start: scheduledStart,
			p_information: (options?.information ?? null) as string,
			p_stocks_included: options?.stocksIncluded ?? false,
			p_custom_tasks: options?.customTasks ?? [],
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as string, error: null };
	},

	async updateCleaning(
		cleaningId: string,
		payload: UpdateCleaningPayload,
	): Promise<ActionResult<string>> {
		const { data, error } = await supabase.rpc('admin_update_cleaning', {
			p_cleaning_id: cleaningId,
			p_custom_tasks: payload.custom_tasks,
			p_information: payload.information,
			p_scheduled_start: payload.scheduled_start,
			p_stocks_included: payload.stocks_included,
			p_cleaner_pay: payload.cleaner_pay ?? undefined,
			p_service_cost: payload.service_cost ?? undefined,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as string, error: null };
	},

	async softDeleteCleaning(cleaningId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_cleaning', {
			p_cleaning_id: cleaningId,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async updateStandardTasks(
		tasks: { id: string | null; description: string; is_active: boolean }[],
		tasksToDelete: string[],
	): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_update_standard_tasks', {
			p_tasks: tasks,
			p_tasks_to_delete: tasksToDelete,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},
};
