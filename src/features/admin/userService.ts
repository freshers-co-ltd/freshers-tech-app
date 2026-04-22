'use client';

import type { UserRole } from '@/features/auth/authService';
import type { CleaningStatus } from '@/features/cleanings/cleaningService';
import type { Property } from '@/features/properties/propertyService';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

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
	last_sign_in_text: string | null;
	total_properties: number;
	total_cleanings: number;
	completed_cleanings: number;
	active_bookings: number;
};

export interface AdminHostDetail extends AdminUser {
	properties: Property[];
	cleanings: {
		id: string;
		status: CleaningStatus;
		scheduled_start: string;
		service_cost: number;
		cleaner_id: string | null;
		property_id: string;
		created_at: string;
	}[];
	cleaning_stats: {
		total: number;
		completed: number;
		in_progress: number;
		pending: number;
	};
}

export interface AdminCleanerDetail extends AdminUser {
	assigned_cleanings: {
		id: string;
		status: CleaningStatus;
		scheduled_start: string;
		service_cost: number;
		host_id: string;
		property_id: string;
		clock_in_time: string | null;
		clock_out_time: string | null;
		created_at: string;
		host_name: string | null;
		property_address: string | null;
	}[];
	cleaner_stats: {
		total_assigned: number;
		completed: number;
		in_progress: number;
		confirmed: number;
		total_earnings: number | null;
		avg_completion_hours: number | null;
	};
}

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

export const userService = {
	async getUsers(
		filters: UserFilters = {},
		page = 1,
		limit = 20,
	): Promise<ActionResult<AdminUser[]>> {
		const { role, search } = filters;

		const { data, error } = await supabase.rpc('admin_get_users', {
			p_role: role || undefined,
			p_search: search || undefined,
			p_page: page,
			p_limit: limit,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: (data ?? []) as unknown as AdminUser[], error: null };
	},

	async getUsersCount(filters: UserFilters = {}): Promise<ActionResult<number>> {
		const { role, search } = filters;

		const { data, error } = await supabase.rpc('admin_get_users_count', {
			p_role: role || undefined,
			p_search: search || undefined,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as number, error: null };
	},

	async getHostDetail(hostId: string): Promise<ActionResult<AdminHostDetail>> {
		const { data, error } = await supabase.rpc('admin_get_host_detail', {
			p_host_id: hostId,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || data.length === 0) {
			return { data: null, error: 'User not found' };
		}

		return { data: data[0] as unknown as AdminHostDetail, error: null };
	},

	async getCleanerDetail(cleanerId: string): Promise<ActionResult<AdminCleanerDetail>> {
		const { data, error } = await supabase.rpc('admin_get_cleaner_detail', {
			p_cleaner_id: cleanerId,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || data.length === 0) {
			return { data: null, error: 'Cleaner not found' };
		}

		return { data: data[0] as unknown as AdminCleanerDetail, error: null };
	},

	async banUser(userId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_ban_user', {
			target_user_id: userId,
			is_banned: true,
		});

		if (error) {
			console.error('[DEBUG] RPC Ban Error:', error);
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async unbanUser(userId: string): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_ban_user', {
			target_user_id: userId,
			is_banned: false,
		});

		if (error) {
			console.error('[DEBUG] RPC Unban Error:', error);
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async resetPassword(userId: string): Promise<ActionResult<void>> {
		const { data: profile, error: profileError } = await supabase
			.from('profiles')
			.select('email')
			.eq('id', userId)
			.single();

		if (profileError || !profile?.email) {
			return { data: null, error: 'User email not found' };
		}

		const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
			redirectTo: `${window.location.origin}/update-password`,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
	},

	async inviteUser(email: string, role: UserRole, fullName: string): Promise<ActionResult<void>> {
		const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
		const edgeFunctionUrl = `${supabaseUrl}/functions/v1/invite-user`;
		const { data: { session } } = await supabase.auth.getSession();

		const response = await fetch(edgeFunctionUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${session?.access_token}`,
			},
			body: JSON.stringify({ email, role, full_name: fullName }),
		});

		const result = await response.json();

		if (!response.ok || result.error) {
			return { data: null, error: result.error || 'Failed to invite user' };
		}

		return { data: undefined, error: null };
	},

	async getAvailableCleaners(): Promise<ActionResult<AvailableCleaner[]>> {
		const { data, error } = await supabase.rpc('admin_get_available_cleaners');

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: data as AvailableCleaner[], error: null };
	},
};