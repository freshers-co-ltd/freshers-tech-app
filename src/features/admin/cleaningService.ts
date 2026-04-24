'use client';

import type { CleaningStatus } from '@/features/cleanings/cleaningService';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export type { CleaningStatus };
export interface AdminCleaning {
	id: string;
	host_id: string;
	property_id: string;
	cleaner_id: string | null;
	status: CleaningStatus;
	scheduled_start: string;
	service_cost: number;
	instructions: string | null;
	stocks_included: boolean;
	clock_in_time: string | null;
	clock_out_time: string | null;
	created_at: string;
	updated_at: string;
	deleted_at: string | null;
	host_name: string | null;
	cleaner_name: string | null;
	property_address: string | null;
	property_postcode: string | null;
}

export interface CleaningFilters {
	status?: CleaningStatus;
	cleanerId?: string | null;
	hostId?: string;
	search?: string;
}

export interface StandardTask {
	id: string;
	description: string;
	is_active: boolean;
	created_at: string;
}

export const cleaningService = {
	async getAllCleanings(
		filters: CleaningFilters = {},
		page = 1,
		limit = 20,
	): Promise<ActionResult<AdminCleaning[]>> {
		const { status, cleanerId, hostId, search } = filters;

		const { data, error } = await supabase.rpc('admin_get_all_cleanings', {
			p_status: (status ?? null) as string,
			p_cleaner_id: (cleanerId === 'unassigned' ? null : (cleanerId ?? null)) as string,
			p_host_id: (hostId ?? null) as string,
			p_search: (search ?? null) as string,
			p_page: page,
			p_limit: limit,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as AdminCleaning[], error: null };
	},

	async getCleaningsCount(filters: CleaningFilters = {}): Promise<ActionResult<number>> {
		const { status, cleanerId, hostId, search } = filters;

		const { data, error } = await supabase.rpc('admin_get_cleanings_count', {
			p_status: (status ?? null) as string,
			p_cleaner_id: (cleanerId === 'unassigned' ? null : (cleanerId ?? null)) as string,
			p_host_id: (hostId ?? null) as string,
			p_search: (search ?? null) as string,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as number, error: null };
	},

	async updateStatus(cleaningId: string, status: CleaningStatus): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_update_cleaning_status', {
			p_cleaning_id: cleaningId,
			p_status: status,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
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
		serviceCost: number,
		options?: {
			instructions?: string;
			stocksIncluded?: boolean;
			customTasks?: string[];
		},
	): Promise<ActionResult<string>> {
		const { data, error } = await supabase.rpc('admin_create_cleaning_for_host', {
			p_host_id: hostId,
			p_property_id: propertyId,
			p_scheduled_start: scheduledStart,
			p_service_cost: serviceCost,
			p_instructions: (options?.instructions ?? null) as string,
			p_stocks_included: options?.stocksIncluded ?? false,
			p_custom_tasks: options?.customTasks ?? [],
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as string, error: null };
	},

	async getStandardTasks(): Promise<ActionResult<StandardTask[]>> {
		const { data, error } = await supabase.rpc('admin_get_standard_tasks');

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as StandardTask[], error: null };
	},

	async updateStandardTasks(
		taskDescriptions: string[],
		isActive = true,
	): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_update_standard_tasks', {
			p_task_descriptions: taskDescriptions,
			p_is_active: isActive,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},
};
