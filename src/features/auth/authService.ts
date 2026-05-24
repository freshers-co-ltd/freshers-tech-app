import type { AuthError } from '@supabase/supabase-js';
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
};
