import type { AuthError, User } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'host' | 'cleaner' | 'admin';

export interface Profile {
	id: string;
	email: string;
	role: UserRole;
	full_name: string | null;
	avatar_url: string | null;
	is_verified: boolean;
}

export interface AuthActionResult {
	error: string | null;
	user?: User | null;
	needsConfirmation?: boolean;
}

const mapAuthError = (error: AuthError): string => {
	switch (error.code) {
		case 'user_already_exists':
			return DICT.ERRORS.AUTH.USER_EXISTS;
		case 'invalid_credentials':
			return DICT.ERRORS.AUTH.INVALID_CREDENTIALS;
		case 'email_not_confirmed':
			return DICT.ERRORS.AUTH.EMAIL_NOT_CONFIRMED;
		default:
			if (error.message?.includes('Failed to fetch')) {
				return DICT.ERRORS.COMMON.NETWORK;
			}
			return error.message;
	}
};

const REQUEST_TIMEOUT_MS = 30000;

export const authService = {
	async signIn(credentials: { email: string; password: string }): Promise<AuthActionResult> {
		if (import.meta.env.DEV) {
			console.log('[AuthService] Attempting login for:', credentials.email);
		}

		const { data, error } = await supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password,
		});

		if (import.meta.env.DEV) {
			console.log('[AuthService] Supabase response received:', { data, error });
		}

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
		const controller = new AbortController();
		const timeoutId = setTimeout(() => {
			controller.abort();
		}, REQUEST_TIMEOUT_MS);

		try {
			if (import.meta.env.DEV) {
				console.log('[AuthService] Attempting signup for:', credentials.email);
			}

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

			clearTimeout(timeoutId);
			if (import.meta.env.DEV) {
				console.log('[AuthService] Supabase response received:', { data, error });
			}

			if (error) {
				return { error: mapAuthError(error) };
			}

			return {
				error: null,
				user: data.user,
				needsConfirmation: data.session === null,
			};
		} catch (err: unknown) {
			clearTimeout(timeoutId);
			if (err instanceof Error && err.name === 'AbortError') {
				return {
					error: DICT.ERRORS.COMMON.TIMEOUT,
				};
			}
			return {
				error: err instanceof Error ? err.message : DICT.ERRORS.COMMON.GENERIC,
			};
		}
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
		if (import.meta.env.DEV) {
			console.log('[AuthService] Requesting password reset for:', email);
		}

		const { error } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/update-password`,
		});

		if (import.meta.env.DEV) {
			console.log('[AuthService] Reset response received:', { error });
		}

		return { error: error ? mapAuthError(error) : null };
	},

	async updatePassword(password: string): Promise<{ error: string | null }> {
		if (import.meta.env.DEV) {
			console.log('[AuthService] Attempting password update');
		}

		const { error } = await supabase.auth.updateUser({ password });

		if (import.meta.env.DEV) {
			console.log('[AuthService] Update response received:', { error });
		}

		return { error: error ? mapAuthError(error) : null };
	},

	async signOut(): Promise<{ error: string | null }> {
		if (import.meta.env.DEV) {
			console.log('[AuthService] Attempting sign out');
		}

		const { error } = await supabase.auth.signOut();

		if (import.meta.env.DEV) {
			console.log('[AuthService] Sign out response received:', { error });
		}

		return { error: error ? mapAuthError(error) : null };
	},

	async getCurrentUser() {
		const response = await supabase.auth.getUser();
		if (import.meta.env.DEV) {
			console.log('[AuthService] Get current user response:', response);
		}
		return response;
	},

	async getProfile(userId: string): Promise<{ data: Profile | null; error: string | null }> {
		const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();

		if (error) {
			return { data: null, error: error.message };
		}
		return { data: data as Profile, error: null };
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

	async uploadAvatar(
		userId: string,
		file: File,
	): Promise<{ url: string | null; error: string | null }> {
		const fileExt = file.name.split('.').pop();
		const filePath = `${userId}/avatar.${fileExt}`;

		const { error: uploadError } = await supabase.storage
			.from('avatars')
			.upload(filePath, file, { upsert: true });

		if (uploadError) {
			return { url: null, error: uploadError.message };
		}

		const {
			data: { publicUrl },
		} = supabase.storage.from('avatars').getPublicUrl(filePath);

		return { url: publicUrl, error: null };
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
};
