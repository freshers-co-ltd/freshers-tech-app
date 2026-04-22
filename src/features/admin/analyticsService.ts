'use client';

import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export interface VolumeMetrics {
	active_properties: number;
	active_hosts: number;
	active_cleaners: number;
	completed_mtd: number;
	completed_ytd: number;
	total_mtd: number;
	calculated_at: string;
}

export interface OperationalHealth {
	avg_completion_hours: number;
	broken_items_mtd: number;
	low_supplies_mtd: number;
	cleaner_utilization_pct: number;
	in_progress: number;
	calculated_at: string;
}

export interface UserStats {
	total_users: number;
	online_users: number;
	banned_users: number;
	hosts_count: number;
	cleaners_count: number;
	admins_count: number;
	new_users_this_month: number;
	new_users_last_month: number;
	recently_online: number;
	online_now: number;
}

export interface AuditLogEntry {
	id: string;
	actor_id: string | null;
	target_id: string;
	target_table: string;
	action_type: string;
	old_data: Record<string, unknown> | null;
	new_data: Record<string, unknown> | null;
	created_at: string;
	actor_name: string | null;
}

export interface AuditFilters {
	targetTable?: string;
	actionType?: string;
}

export const analyticsService = {
	async getVolumeMetrics(): Promise<ActionResult<VolumeMetrics>> {
		const { data, error } = await supabase.from('admin_volume_metrics').select('*').single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as VolumeMetrics, error: null };
	},

	async getOperationalHealth(): Promise<ActionResult<OperationalHealth>> {
		const { data, error } = await supabase.from('admin_operational_health').select('*').single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as OperationalHealth, error: null };
	},

	async getAuditLogs(
		filters: AuditFilters = {},
		page = 1,
		limit = 50,
	): Promise<ActionResult<AuditLogEntry[]>> {
		const { targetTable, actionType } = filters;

		const { data, error } = await supabase.rpc('admin_get_audit_logs', {
			p_target_table: (targetTable ?? null) as string,
			p_action_type: (actionType ?? null) as string,
			p_page: page,
			p_limit: limit,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as AuditLogEntry[], error: null };
	},

	async getUserStats(): Promise<ActionResult<UserStats>> {
		const { data, error } = await supabase.rpc('admin_get_user_stats');

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || data.length === 0) {
			return { data: null, error: 'No stats available' };
		}

		return { data: data[0] as unknown as UserStats, error: null };
	},
};
