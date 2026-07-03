import type { AuthError, Session } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import type { AuthActionResult, UserRole } from '@/features/auth/types';
import { supabase, supabaseImplicit } from '@/lib/supabaseClient';

export const mapAuthError = (error: AuthError): string => {
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

const getLoginLockStatus = async (email: string): Promise<{ is_locked: boolean }> => {
	try {
		const { data, error } = await supabase.rpc('get_login_lock_status', {
			p_email: email,
		});

		if (error || !data || data.length === 0) {
			return { is_locked: false };
		}

		return { is_locked: data[0]?.is_locked ?? false };
	} catch {
		return { is_locked: false };
	}
};

const recordLoginAttempt = async (
	email: string,
	success: boolean,
): Promise<{ is_locked: boolean }> => {
	try {
		const { data, error } = await supabase.rpc('record_login_attempt', {
			p_email: email,
			p_success: success,
		});

		if (error || !data || data.length === 0) {
			return { is_locked: false };
		}

		return { is_locked: data[0]?.is_locked ?? false };
	} catch {
		return { is_locked: false };
	}
};

export const authService = {
	async signIn(credentials: { email: string; password: string }): Promise<AuthActionResult> {
		const { is_locked } = await getLoginLockStatus(credentials.email);

		if (is_locked) {
			return { error: DICT.ERRORS.AUTH.ACCOUNT_LOCKED };
		}

		const { data, error } = await supabase.auth.signInWithPassword({
			email: credentials.email,
			password: credentials.password,
		});

		if (error) {
			await recordLoginAttempt(credentials.email, false);
			return { error: mapAuthError(error) };
		}

		await recordLoginAttempt(credentials.email, true);

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
			const authError = error as AuthError;
			if (
				authError?.code === 'user_already_exists' ||
				authError?.code === 'P0001' ||
				authError?.message?.includes('Signup blocked')
			) {
				return { error: null, user: null, needsConfirmation: true };
			}
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

		void error;
		return { error: null };
	},

	async resetPassword(email: string): Promise<{ error: string | null }> {
		const { error } = await supabaseImplicit.auth.resetPasswordForEmail(email, {
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

	async exchangeCodeForSession(code: string) {
		return supabase.auth.exchangeCodeForSession(code);
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
};
