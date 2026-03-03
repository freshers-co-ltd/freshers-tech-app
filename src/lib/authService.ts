import type { AuthError, User } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import { supabase } from '@/lib/supabaseClient';

export type UserRole = 'host' | 'cleaner' | 'admin';

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
				return DICT.COMMON.ERROR_NETWORK;
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
					error: DICT.COMMON.ERROR_TIMEOUT,
				};
			}
			return {
				error: err instanceof Error ? err.message : DICT.COMMON.ERROR_GENERIC,
			};
		}
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
};
