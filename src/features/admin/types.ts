'use client';

import type { UserRole } from '@/features/auth/types';
import type { CleaningStatus } from '@/features/cleanings/types';
import type { Property } from '@/features/properties/types';

export type { CleaningStatus };

export interface AdminCleaning {
	id: string;
	host_id: string;
	property_id: string;
	cleaner_id: string | null;
	status: CleaningStatus;
	scheduled_start: string;
	service_cost: number;
	cleaner_pay: number | null;
	information: string | null;
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
	property_town_city: string | null;
}

export interface CleaningFilters {
	status?: CleaningStatus;
	cleanerId?: string | null;
	hostId?: string;
	search?: string;
}

export interface UpdateCleaningPayload {
	custom_tasks: string[];
	information: string;
	scheduled_start: string;
	stocks_included: boolean;
	cleaner_pay?: number | null;
}

export type AdminUser = {
	id: string;
	email: string | null;
	full_name: string | null;
	role: UserRole;
	is_verified: boolean | null;
	avatar_url: string | null;
	banned_until: string | null;
	created_at: string | null;
	last_sign_in_at: string | null;
	last_seen_at: string | null;
	is_online: boolean;
	last_sign_in_text?: string | null;
	deleted_at: string | null;
};

export interface AdminHostDetail extends AdminUser {
	properties: Property[];
	cleanings: {
		id: string;
		status: CleaningStatus;
		scheduled_start: string;
		service_cost: number;
		cleaner_pay: number | null;
		cleaner_id: string | null;
		cleaner_name: string | null;
		property_id: string;
		created_at: string;
	}[];
	cleaning_stats: {
		total: number;
		requested: number;
		confirmed: number;
		in_progress: number;
	};
}

export interface AdminCleanerDetail extends AdminUser {
	assigned_cleanings: {
		id: string;
		status: CleaningStatus;
		scheduled_start: string;
		service_cost: number;
		cleaner_pay: number | null;
		host_id: string;
		property_id: string;
		clock_in_time: string | null;
		clock_out_time: string | null;
		created_at: string;
		host_name: string | null;
		property_address: string | null;
		property_postcode: string | null;
		property_town_city: string | null;
	}[];
	cleaner_stats: {
		total_assigned: number;
		completed: number;
		confirmed: number;
		avg_completion_hours: number | null;
	};
}

export type SortField = 'name' | 'email' | 'role' | 'status' | 'last_online' | 'joined';
export type SortDirection = 'asc' | 'desc';
export type UserTab = 'all' | 'host' | 'cleaner' | 'admin';

export interface UserFilters {
	role?: UserRole;
	search?: string;
}

export interface AvailableCleaner {
	id: string;
	full_name: string | null;
	avatar_url: string | null;
	current_assignments: number;
	avg_completion_hours: number | null;
}

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
	gross: number;
	net: number;
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
	gross_revenue_current: number;
	net_revenue_current: number;
	gross_revenue_last_month: number;
	net_revenue_last_month: number;
	gross_revenue_change_pct: number;
	net_revenue_change_pct: number;
}
