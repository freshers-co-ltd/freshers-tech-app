'use client';

import type {
	AuditFilters,
	AuditLogEntry,
	MonthlyStats,
	PlatformStats,
	RevenueMetrics,
	StatusBreakdown,
	UserGrowthByMonth,
	UserStats,
} from '@/features/admin/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

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
