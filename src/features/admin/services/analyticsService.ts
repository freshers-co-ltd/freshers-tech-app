'use client';

import { z } from 'zod';
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

function validateSingle<T>(
	schema: z.ZodTypeAny,
	data: unknown,
	label: string,
): { valid: true; data: T } | { valid: false; error: string } {
	const result = schema.safeParse(data);
	if (!result.success) {
		if (import.meta.env.DEV) {
			console.error(`[${label}] RPC response validation failed:`, result.error.issues);
		}
		return { valid: false, error: `Invalid ${label} response` };
	}
	return { valid: true, data: result.data as T };
}

function validateArray<T>(
	schema: z.ZodTypeAny,
	data: unknown,
	label: string,
): { valid: true; data: T[] } | { valid: false; error: string } {
	const result = z.array(schema).safeParse(data);
	if (!result.success) {
		if (import.meta.env.DEV) {
			console.error(`[${label}] RPC response validation failed:`, result.error.issues);
		}
		return { valid: false, error: `Invalid ${label} response` };
	}
	return { valid: true, data: result.data as T[] };
}

const UserStatsSchema = z.object({
	total_users: z.number(),
	banned_users: z.number(),
	hosts_count: z.number(),
	cleaners_count: z.number(),
	admins_count: z.number(),
	new_users_this_month: z.number(),
	new_users_last_month: z.number(),
	recently_online: z.number(),
	online_now: z.number(),
});

const RevenueMetricsSchema = z.object({
	completed_count: z.number(),
	cancelled_count: z.number(),
	pending_count: z.number(),
	in_progress_count: z.number(),
	revenue_current: z.number(),
	revenue_last_month: z.number(),
	avg_completion_hours: z.number(),
	revenue_change_pct: z.number(),
	completed_change_pct: z.number(),
	gross_revenue_current: z.number(),
	net_revenue_current: z.number(),
	gross_revenue_last_month: z.number(),
	net_revenue_last_month: z.number(),
	gross_revenue_change_pct: z.number(),
	net_revenue_change_pct: z.number(),
});

const MonthlyStatsSchema = z.object({
	month: z.string(),
	cleanings: z.number(),
	revenue: z.number(),
	gross: z.number(),
	net: z.number(),
});

const UserGrowthByMonthSchema = z.object({
	month: z.string(),
	hosts: z.number(),
	cleaners: z.number(),
});

const StatusBreakdownSchema = z.object({
	status: z.string(),
	count: z.number(),
});

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

		return { data: (data ?? []) as unknown as AuditLogEntry[], error: null };
	},

	async getUserStats(): Promise<ActionResult<UserStats>> {
		const { data, error } = await supabase.rpc('admin_get_user_stats');

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || !Array.isArray(data) || data.length === 0) {
			return { data: null, error: 'No stats available' };
		}

		const userStats = validateSingle<UserStats>(UserStatsSchema, data[0], 'UserStats');
		if (!userStats.valid) {
			return { data: null, error: userStats.error };
		}
		return { data: userStats.data, error: null };
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

		const revenueMetrics = validateSingle<RevenueMetrics>(
			RevenueMetricsSchema,
			data[0],
			'RevenueMetrics',
		);
		if (!revenueMetrics.valid) {
			return { data: null, error: revenueMetrics.error };
		}
		return { data: revenueMetrics.data, error: null };
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

		const monthlyStats = validateArray<MonthlyStats>(
			MonthlyStatsSchema,
			data ?? [],
			'MonthlyStats',
		);
		if (!monthlyStats.valid) {
			return { data: null, error: monthlyStats.error };
		}
		return { data: monthlyStats.data, error: null };
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

		const userGrowth = validateArray<UserGrowthByMonth>(
			UserGrowthByMonthSchema,
			data ?? [],
			'UserGrowthByMonth',
		);
		if (!userGrowth.valid) {
			return { data: null, error: userGrowth.error };
		}
		return { data: userGrowth.data, error: null };
	},

	async getActiveCleanings(): Promise<ActionResult<StatusBreakdown[]>> {
		const fnName = 'admin_get_active_cleanings' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		const activeCleanings = validateArray<StatusBreakdown>(
			StatusBreakdownSchema,
			data ?? [],
			'StatusBreakdown',
		);
		if (!activeCleanings.valid) {
			return { data: null, error: activeCleanings.error };
		}
		return { data: activeCleanings.data, error: null };
	},

	async getCleaningsOverTime(): Promise<ActionResult<MonthlyStats[]>> {
		const fnName = 'admin_get_cleanings_over_time' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		const cleaningsOverTime = validateArray<MonthlyStats>(
			MonthlyStatsSchema,
			data ?? [],
			'MonthlyStats',
		);
		if (!cleaningsOverTime.valid) {
			return { data: null, error: cleaningsOverTime.error };
		}
		return { data: cleaningsOverTime.data, error: null };
	},

	async getRevenueOverTime(): Promise<ActionResult<MonthlyStats[]>> {
		const fnName = 'admin_get_revenue_over_time' as const;
		const { data, error } = await supabase.rpc(fnName as Parameters<typeof supabase.rpc>[0]);

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		const revenueOverTime = validateArray<MonthlyStats>(
			MonthlyStatsSchema,
			data ?? [],
			'MonthlyStats',
		);
		if (!revenueOverTime.valid) {
			return { data: null, error: revenueOverTime.error };
		}
		return { data: revenueOverTime.data, error: null };
	},
};
