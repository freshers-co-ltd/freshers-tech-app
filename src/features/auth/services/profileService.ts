import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import type { Profile, UserRole } from '@/features/auth/types';
import { supabase } from '@/lib/supabaseClient';

export const profileService = {
	async getProfile(userId: string): Promise<{ data: Profile | null; error: string | null }> {
		const { data, error } = await supabase
			.from('profiles')
			.select('id, full_name, avatar_url, role, deleted_at, is_verified')
			.eq('id', userId)
			.single();

		if (error) {
			return { data: null, error: error.message };
		}
		return { data: data as unknown as Profile, error: null };
	},

	async updateProfile(
		userId: string,
		updates: Partial<Profile>,
	): Promise<{ error: string | null }> {
		const { error } = await supabase.from('profiles').update(updates).eq('id', userId);

		if (error) {
			return { error: error.message };
		}
		return { error: null };
	},

	async getProfileWithFallback(
		userId: string,
		signal?: AbortSignal,
		retryCount: number = 0,
	): Promise<{ data: Profile | null; error: string | null }> {
		const timeout = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(new Error('DB_TIMEOUT'));
			}, 10000);
		});

		try {
			const fetchPromise = supabase
				.from('profiles')
				.select('id, full_name, avatar_url, role, deleted_at, is_verified')
				.eq('id', userId)
				.single();
			const { data, error } = (await Promise.race([fetchPromise, timeout])) as unknown as PostgrestSingleResponse<unknown>;

			if (error) {
				throw error;
			}

			if (signal?.aborted) {
				return { data: null, error: null };
			}

			return { data: data as unknown as Profile, error: null };
		} catch (err: unknown) {
			if (retryCount < 2 && !(err instanceof Error && err.name === 'AbortError')) {
				await new Promise((resolve) => setTimeout(resolve, 2000));
				return profileService.getProfileWithFallback(userId, signal, retryCount + 1);
			}

			const {
				data: { user },
			} = await supabase.auth.getUser();
			if (user) {
				const rawRole = user.user_metadata?.role;
				const role: UserRole =
					rawRole === 'admin' || rawRole === 'host' || rawRole === 'cleaner' ? rawRole : 'cleaner';
				const fallback: Profile = {
					id: user.id,
					full_name: user.user_metadata?.full_name || 'User',
					role,
					avatar_url: user.user_metadata?.avatar_url || null,
					email: user.email || '',
					is_verified: false,
				};
				return { data: fallback, error: null };
			}
			return { data: null, error: 'Failed to fetch profile' };
		}
	},
};
