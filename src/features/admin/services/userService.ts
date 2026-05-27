'use client';

import type {
	AdminCleanerDetail,
	AdminHostDetail,
	AdminUser,
	AvailableCleaner,
	SortDirection,
	SortField,
	UserFilters,
} from '@/features/admin/types';
import type { UserRole } from '@/features/auth/types';
import { type ActionResult, mapDatabaseError } from '@/lib/serviceUtils';
import { supabase } from '@/lib/supabaseClient';

export const userService = {
	async getUsers(
		filters: UserFilters = {},
		page = 1,
		limit = 20,
		sortField: SortField = 'name',
		sortDirection: SortDirection = 'asc',
	): Promise<ActionResult<AdminUser[]>> {
		const { role, search } = filters;

		const { data, error } = await supabase.rpc('admin_get_users', {
			p_role: role || undefined,
			p_search: search || undefined,
			p_page: page,
			p_limit: limit,
			p_sort_field: sortField,
			p_sort_direction: sortDirection,
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

	async getHostDetail(
		hostId: string,
		propertiesSortField?: string,
		propertiesSortDirection?: 'asc' | 'desc',
	): Promise<ActionResult<AdminHostDetail>> {
		const { data, error } = await supabase.rpc('admin_get_host_detail', {
			p_host_id: hostId,
			p_properties_sort_field: propertiesSortField || 'created_at',
			p_properties_sort_direction: propertiesSortDirection || 'desc',
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		if (!data || data.length === 0) {
			return { data: null, error: 'User not found' };
		}

		return { data: data[0] as unknown as AdminHostDetail, error: null };
	},

	async updatePropertyPrice(propertyId: string, price: number): Promise<ActionResult<void>> {
		const { error } = await supabase.rpc('admin_update_property_price', {
			p_property_id: propertyId,
			p_price: price,
		});

		if (error) {
			return { data: null, error: mapDatabaseError(error) };
		}

		return { data: undefined, error: null };
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
		const {
			data: { session },
		} = await supabase.auth.getSession();

		const response = await fetch(edgeFunctionUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${session?.access_token}`,
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
