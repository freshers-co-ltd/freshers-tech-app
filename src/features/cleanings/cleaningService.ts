'use client';

import type {
	CleanerPayConfig,
	CleaningRequest,
	CleaningUpdate,
	CreateCleaningRequestPayload,
	EvidenceInsert,
	RawCleaningRequestQueryResult,
	ReportInsert,
	StandardTask,
	TaskInsert,
	TaskUpdate,
	UpdateCleaningRequestPayload,
} from '@/features/cleanings/types';
import { CLEANING_STATUS } from '@/features/cleanings/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

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

/**
 * Normalises raw database response to CleaningRequest format.
 * Handles array-to-single-item normalisation for foreign key relations.
 */
const normaliseCleaningRequest = (item: RawCleaningRequestQueryResult): CleaningRequest => {
	const propertyData = Array.isArray(item.property) ? item.property[0] : item.property;
	const cleanerData = Array.isArray(item.cleaner) ? item.cleaner[0] : item.cleaner;
	const reportData = Array.isArray(item.cleaning_reports)
		? item.cleaning_reports[0]
		: item.cleaning_reports;

	return {
		...item,
		property: propertyData || null,
		tasks: item.cleaning_tasks || [],
		cleaner: cleanerData || null,
		evidence: item.evidence || [],
		report: reportData || null,
	};
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
                property:properties (*),
                cleaner:profiles_public!cleanings_cleaner_id_fkey (
                    full_name, 
                    avatar_url
                ),
                evidence:evidence_media (id, media_url, type),
                cleaning_tasks (
                    id,
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
			.order('created_at', { ascending: false });

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data) {
			return { data: [], error: null };
		}

		const typedData: CleaningRequest[] = (data as unknown[])
			.filter(isRawCleaningQueryResult)
			.map(normaliseCleaningRequest);

		return { data: typedData, error: null };
	},

	async getCleaningRequestById(id: string): Promise<ActionResult<CleaningRequest>> {
		const { data, error } = await supabase
			.from('cleanings')
			.select(`
                *,
                property:properties (*),
                cleaner:profiles_public!cleanings_cleaner_id_fkey (full_name, avatar_url),
                evidence:evidence_media (id, media_url, type),
                cleaning_tasks (id, description, is_completed, is_custom),
                cleaning_reports (broken_items_report, low_supplies_report, created_at)
            `)
			.eq('id', id)
			.single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!isRawCleaningQueryResult(data)) {
			throw new Error('Invalid response from database for cleaning request.');
		}

		const transformed = normaliseCleaningRequest(data as RawCleaningRequestQueryResult);

		return { data: transformed, error: null };
	},

	async createCleaningRequest(
		payload: CreateCleaningRequestPayload,
	): Promise<ActionResult<CleaningRequest>> {
		const { data: id, error } = await supabase.rpc('create_cleaning_request', {
			p_property_id: payload.property_id,
			p_custom_tasks: payload.custom_tasks,
			p_information: payload.information,
			p_scheduled_start: payload.scheduled_start,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return this.getCleaningRequestById(id as string);
	},

	async updateCleaningRequest(
		id: string,
		payload: CleaningUpdate,
	): Promise<ActionResult<CleaningRequest>> {
		const { error } = await supabase.from('cleanings').update(payload).eq('id', id);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return this.getCleaningRequestById(id);
	},

	async updateCleaningRequestRPC(
		id: string,
		payload: UpdateCleaningRequestPayload,
	): Promise<ActionResult<CleaningRequest>> {
		const { error } = await supabase.rpc('update_cleaning_request', {
			p_cleaning_id: id,
			p_custom_tasks: payload.custom_tasks,
			p_information: payload.information,
			p_scheduled_start: payload.scheduled_start,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return this.getCleaningRequestById(id);
	},

	async softDeleteCleaningRequest(id: string): Promise<{ error: string | null }> {
		const { data: cleaning, error: fetchError } = await supabase
			.from('cleanings')
			.select('status')
			.eq('id', id)
			.single();

		if (fetchError) {
			return { error: mapDatabaseError(fetchError) };
		}

		if (cleaning?.status === CLEANING_STATUS.REQUESTED) {
			const { error: cancelError } = await supabase.rpc('host_cancel_cleaning', {
				p_cleaning_id: id,
			});
			if (cancelError) {
				return { error: mapDatabaseError(cancelError) };
			}
			return { error: null };
		}

		const { error } = await supabase.rpc('soft_delete_cleaning', {
			p_cleaning_id: id,
		});

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},

	async hardDeleteCleaningRequest(id: string): Promise<{ error: string | null }> {
		const { error } = await supabase.from('cleanings').delete().eq('id', id);

		if (error) {
			return { error: mapDatabaseError(error) };
		}

		return { error: null };
	},

	async insertTask(payload: TaskInsert): Promise<ActionResult<void>> {
		const { error } = await supabase.from('cleaning_tasks').insert(payload);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async updateTask(payload: TaskUpdate): Promise<ActionResult<void>> {
		if (!payload.id) {
			return { data: null, error: 'Task ID is required for updates' };
		}

		const { error } = await supabase.from('cleaning_tasks').update(payload).eq('id', payload.id);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
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

	async insertEvidence(payload: EvidenceInsert): Promise<ActionResult<void>> {
		const { error } = await supabase.from('evidence_media').insert(payload);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async softDeleteEvidence(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_evidence_media', {
			p_evidence_id: id,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async hardDeleteEvidence(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.from('evidence_media').delete().eq('id', id);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async upsertReport(payload: ReportInsert): Promise<ActionResult<void>> {
		const { error } = await supabase.from('cleaning_reports').upsert(payload);
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

	async softDeleteReport(id: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('soft_delete_cleaning_report', {
			p_report_id: id,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},

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

	async getCleanerPayConfig(): Promise<ActionResult<CleanerPayConfig>> {
		const { data, error } = await supabase.rpc('get_cleaner_pay_config');
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		if (!data || data.length === 0) {
			return { data: null, error: 'No config found' };
		}
		const config = data[0] as unknown as CleanerPayConfig;
		return {
			data: { ...config, bathroom_time: config.bathroom_time ?? 0.5 },
			error: null,
		};
	},

	async updateCleanerPayConfig(config: CleanerPayConfig): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('update_cleaner_pay_config', {
			p_hourly_rate: config.hourly_rate,
			p_target_times: config.target_times,
			p_bathroom_time: config.bathroom_time,
		});
		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}
		return { data: undefined, error: null };
	},
};
