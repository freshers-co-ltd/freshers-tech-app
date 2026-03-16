import type { Property } from '@/features/properties/propertyService';
import type { Database } from '@/lib/database.types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export type CleaningDetails = Database['public']['Tables']['cleanings']['Row'];
export type CleaningInsert = Database['public']['Tables']['cleanings']['Insert'];
export type CleaningUpdate = Database['public']['Tables']['cleanings']['Update'];

export const STATUS = {
	ALL: ['draft', 'requested', 'confirmed', 'in_progress', 'completed', 'cancelled'],
	CAN_CANCEL: ['draft', 'requested'],
	CAN_EDIT: ['draft', 'requested', 'confirmed'],
	CAN_EDIT_RESTRICTED: ['confirmed'],
};

export interface CleaningRequest extends CleaningDetails {
	tasks: {
		description: string;
		is_completed: boolean;
		is_custom: boolean;
	}[];
	properties: Property | null;
	cleaner?: {
		full_name: string;
		avatar_url: string | null;
	} | null;
	evidence?: {
		id: string;
		media_url: string;
		type: 'image' | 'video';
	}[];
	report?: {
		broken_items_report: string | null;
		low_supplies_report: string | null;
		created_at: string;
	} | null;
}

export interface CreateCleaningRequestPayload {
	property_id: string;
	service_cost: number;
	scheduled_start: string;
	custom_tasks: string[];
}

export interface UpdateCleaningRequestPayload {
	scheduled_start: string;
	instructions: string;
	custom_tasks: string[];
}

interface RawCleaningRequestQueryResult extends CleaningDetails {
	cleaning_tasks: {
		description: string;
		is_completed: boolean;
		is_custom: boolean;
	}[];
	properties: Property | Property[] | null;
	cleaner:
		| { full_name: string; avatar_url: string | null }
		| { full_name: string; avatar_url: string | null }[]
		| null;
	evidence: { id: string; media_url: string; type: 'image' | 'video' }[];
	cleaning_reports:
		| {
				broken_items_report: string | null;
				low_supplies_report: string | null;
				created_at: string;
		  }
		| {
				broken_items_report: string | null;
				low_supplies_report: string | null;
				created_at: string;
		  }[]
		| null;
}

const isRawCleaningQueryResult = (item: unknown): item is RawCleaningRequestQueryResult => {
	const i = item as RawCleaningRequestQueryResult;
	return (
		i !== null &&
		typeof i === 'object' &&
		'id' in i &&
		'cleaning_tasks' in i &&
		Array.isArray(i.cleaning_tasks)
	);
};

export const cleaningService = {
	async getCleaningRequests(): Promise<ActionResult<CleaningRequest[]>> {
		const {
			data: { user },
		} = await supabase.auth.getUser();

		if (!user) {
			return { data: [], error: 'Not authenticated' };
		}

		const { data, error } = await supabase
			.from('cleanings')
			.select(`
                *,
                properties (*),
                cleaner:profiles_public!cleanings_cleaner_id_fkey (
                    full_name, 
                    avatar_url
                ),
                evidence:evidence_media (id, media_url, type),
                cleaning_tasks (
                    description,
                    is_completed,
                    is_custom
                ),
                cleaning_reports (
                    broken_items_report,
                    low_supplies_report,
                    created_at
                )
            `)
			.eq('host_id', user.id)
			.order('created_at', { ascending: false });

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data) {
			return { data: [], error: null };
		}

		const typedData: CleaningRequest[] = (data as unknown[])
			.filter(isRawCleaningQueryResult)
			.map((item) => {
				const propertyData = Array.isArray(item.properties) ? item.properties[0] : item.properties;
				const cleanerData = Array.isArray(item.cleaner) ? item.cleaner[0] : item.cleaner;
				const reportData = Array.isArray(item.cleaning_reports)
					? item.cleaning_reports[0]
					: item.cleaning_reports;

				return {
					...item,
					properties: propertyData || null,
					tasks: item.cleaning_tasks || [],
					cleaner: cleanerData || null,
					evidence: item.evidence || [],
					report: reportData || null,
				};
			});

		return { data: typedData, error: null };
	},

	async createCleaningRequest(
		payload: CreateCleaningRequestPayload,
	): Promise<ActionResult<string>> {
		const { data, error } = await supabase.rpc('create_cleaning_request', {
			p_property_id: payload.property_id,
			p_service_cost: payload.service_cost,
			p_scheduled_start: payload.scheduled_start,
			p_custom_tasks: payload.custom_tasks,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as string, error: null };
	},

	async updateCleaningRequest(
		id: string,
		payload: UpdateCleaningRequestPayload,
	): Promise<ActionResult<string>> {
		const { data, error } = await supabase.rpc('update_cleaning_request', {
			p_cleaning_id: id,
			p_custom_tasks: payload.custom_tasks,
			p_instructions: payload.instructions,
			p_scheduled_start: payload.scheduled_start,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (data === null) {
			return { data: null, error: 'Update failed: No data returned' };
		}

		return { data: data as string, error: null };
	},

	async deleteCleaningRequest(id: string): Promise<{ error: string | null }> {
		const { error } = await supabase.from('cleanings').delete().eq('id', id);

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},
};
