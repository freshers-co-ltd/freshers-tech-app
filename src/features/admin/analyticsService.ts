'use client';

import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export interface PlatformStats {
	total_properties: number;
	total_hosts: number;
	total_cleaners: number;
	completed_cleanings_mtd: number;
	completed_cleanings_ytd: number;
	total_cleanings_mtd: number;
	cleanings_in_progress: number;
	avg_completion_hours: number;
	broken_items_mtd: number;
	low_supplies_mtd: number;
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

export interface MonthlyStats {
	month: string;
	cleanings: number;
	revenue: number;
}

export interface UserGrowthByMonth {
	month: string;
	hosts: number;
	cleaners: number;
}

export interface StatusBreakdown {
	status: string;
	count: number;
}

export interface RevenueMetrics {
	completed_count: number;
	cancelled_count: number;
	pending_count: number;
	in_progress_count: number;
	revenue_current: number;
	revenue_last_month: number;
	avg_completion_hours: number;
	revenue_change_pct: number;
	completed_change_pct: number;
}

type RpcParams = Record<string, unknown>;

export const analyticsService = {
	async getPlatformStats(): Promise<ActionResult<PlatformStats>> {
		const { data, error } = await supabase.from('platform_stats').select('*').single();

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as PlatformStats, error: null };
	},

	async getOperationalHealth(): Promise<ActionResult<PlatformStats>> {
		return this.getPlatformStats();
	},

	async getAuditLogs(
		filters: AuditFilters = {},
		page = 1,
		limit = 50,
		dateFrom: string | null = null,
		dateTo: string | null = null,
	): Promise<ActionResult<AuditLogEntry[]>> {
		const { targetTable, actionType } = filters;

		const { data, error } = await supabase.rpc('admin_get_audit_logs', {
			p_target_table: (targetTable ?? null) as string,
			p_action_type: (actionType ?? null) as string,
			p_page: page,
			p_limit: limit,
			p_date_from: dateFrom ?? undefined,
			p_date_to: dateTo ?? undefined,
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

		if (!data || !Array.isArray(data) || data.length === 0) {
			return { data: null, error: 'No stats available' };
		}

		return { data: data[0] as unknown as UserStats, error: null };
	},

	async getRevenueMetrics(): Promise<ActionResult<RevenueMetrics>> {
		const fnName = 'admin_get_revenue_metrics' as const;
		const { data, error } = await supabase.rpc(
			fnName as Parameters<typeof supabase.rpc>[0],
			{ p_months: 1 } as RpcParams,
		);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || !Array.isArray(data)) {
			return { data: null, error: 'No revenue data available' };
		}

		return { data: data[0] as unknown as RevenueMetrics, error: null };
	},

	async getMonthlyStats(): Promise<ActionResult<MonthlyStats[]>> {
		const fnName = 'admin_get_monthly_stats' as const;
		const { data, error } = await supabase.rpc(
			fnName as Parameters<typeof supabase.rpc>[0],
			{ p_months: 6 } as RpcParams,
		);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as MonthlyStats[], error: null };
	},

	async getUserGrowthByMonth(): Promise<ActionResult<UserGrowthByMonth[]>> {
		const fnName = 'admin_get_user_growth_by_month' as const;
		const { data, error } = await supabase.rpc(
			fnName as Parameters<typeof supabase.rpc>[0],
			{ p_months: 6 } as RpcParams,
		);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as UserGrowthByMonth[], error: null };
	},

	async getActiveCleanings(): Promise<ActionResult<StatusBreakdown[]>> {
		const fnName = 'admin_get_active_cleanings' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as StatusBreakdown[], error: null };
	},

	async getCleaningsOverTime(): Promise<ActionResult<MonthlyStats[]>> {
		const fnName = 'admin_get_cleanings_over_time' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as MonthlyStats[], error: null };
	},

	async getRevenueOverTime(): Promise<ActionResult<MonthlyStats[]>> {
		const fnName = 'admin_get_revenue_over_time' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as MonthlyStats[], error: null };
	},
};
