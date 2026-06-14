import type { AuthError, PostgrestSingleResponse, Session } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import type { AuthActionResult, Profile, UserRole } from '@/features/auth/types';
import { supabase } from '@/lib/supabaseClient';

const mapAuthError = (error: AuthError): string => {
	switch (error.code) {
		case 'user_already_exists':
			return DICT.ERRORS.AUTH.USER_EXISTS;
		case 'invalid_credentials':
			return DICT.ERRORS.AUTH.INVALID_CREDENTIALS;
		case 'email_not_confirmed':
			return DICT.ERRORS.AUTH.EMAIL_NOT_CONFIRMED;
		case 'user_banned':
			return DICT.ERRORS.AUTH.USER_BANNED;
		default:
			if (error.message?.includes('Failed to fetch')) {
				return DICT.ERRORS.COMMON.NETWORK;
			}
			return error.message;
	}
};

export const authService = {
	async signIn(credentials: { email: string; password: string }): Promise<AuthActionResult> {
		const { data, error } = await supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password,
		});

		if (error) {
			return { error: mapAuthError(error) };
		}

		return {
			error: null,
			user: data.user,
		};
	},

	async signUp(credentials: {
		email: string;
		password: string;
		full_name: string;
		role: UserRole;
	}): Promise<AuthActionResult> {
		const { data, error } = await supabase.auth.signUp({
			email: credentials.email,
			password: credentials.password,
			options: {
				data: {
					full_name: credentials.full_name,
					role: credentials.role,
				},
				emailRedirectTo: `${window.location.origin}/auth/callback`,
			},
		});

		if (error) {
			return { error: mapAuthError(error) };
		}

		return {
			error: null,
			user: data.user,
			needsConfirmation: data.session === null,
		};
	},

	async verifyOtp(email: string, token: string): Promise<AuthActionResult> {
		const { data, error } = await supabase.auth.verifyOtp({
			email,
			token,
			type: 'signup',
		});

		if (error) {
			return { error: mapAuthError(error) };
		}

		return {
			error: null,
			user: data.user,
		};
	},

	async resendSignupConfirmation(email: string): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.resend({
			type: 'signup',
			email: email,
			options: {
				emailRedirectTo: `${window.location.origin}/auth/callback`,
			},
		});

		if (error) {
			return { error: mapAuthError(error) };
		}
		return { error: null };
	},

	async resetPassword(email: string): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/update-password`,
		});

		return { error: error ? mapAuthError(error) : null };
	},

	async updatePassword(password: string): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.updateUser({ password });

		return { error: error ? mapAuthError(error) : null };
	},

	async signOut(): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.signOut();

		return { error: error ? mapAuthError(error) : null };
	},

	async getCurrentUser() {
		return supabase.auth.getUser();
	},

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

	async updateEmail(email: string): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.updateUser({ email });
		if (error) {
			return { error: mapAuthError(error) };
		}
		return { error: null };
	},

	async updateUserMetadata(data: Record<string, unknown>): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.updateUser({ data });
		if (error) {
			return { error: mapAuthError(error) };
		}
		return { error: null };
	},

	async reauthenticate(password: string): Promise<{ error: string | null }> {
		const {
			data: { user },
		} = await supabase.auth.getUser();
		if (!user?.email) {
			return { error: 'User not found' };
		}

		const { error } = await supabase.auth.signInWithPassword({
			email: user.email,
			password,
		});

		return { error: error ? mapAuthError(error) : null };
	},

	async getSession() {
		return supabase.auth.getSession();
	},

	async setSession(session: { access_token: string; refresh_token: string }) {
		return supabase.auth.setSession(session);
	},

	onAuthStateChange(callback: (event: string, session: Session | null) => void) {
		return supabase.auth.onAuthStateChange(callback);
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
			const { data, error } = await (Promise.race([fetchPromise, timeout]) as Promise<
				PostgrestSingleResponse<unknown>
			>);

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
				return authService.getProfileWithFallback(userId, signal, retryCount + 1);
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
