import type { AuthError, PostgrestSingleResponse, Session } from '@supabase/supabase-js';
import { DICT } from '@/dictionary';
import type { AuthActionResult, MfaStatus, Profile, UserRole } from '@/features/auth/types';
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

	async checkMfaStatus(): Promise<{ data: MfaStatus | null; error: string | null }> {
		const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
		if (listError) {
			console.error('[MFA] checkMfaStatus listFactors failed:', listError.message);
			return { data: null, error: listError.message };
		}

		const { data: aalData, error: aalError } =
			await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
		if (aalError) {
			console.error('[MFA] checkMfaStatus aal failed:', aalError.message);
			return { data: null, error: aalError.message };
		}

		const enrolled = (factors?.totp?.length ?? 0) > 0;
		const verified = aalData?.currentLevel === 'aal2';

		return { data: { enrolled, verified }, error: null };
	},

	async enrollMfa(): Promise<{
		data: { id: string; qrCode: string } | null;
		error: string | null;
	}> {
		const { data: existing, error: listError } = await supabase.auth.mfa.listFactors();
		if (listError) {
			console.error('[MFA] enrollMfa listFactors failed:', listError.message);
			return { data: null, error: listError.message };
		}

		const verifiedTotpIds = new Set(existing?.totp?.map((f) => f.id) ?? []);
		const staleFactors =
			existing?.all?.filter((f) => f.factor_type === 'totp' && !verifiedTotpIds.has(f.id)) ?? [];

		for (const factor of staleFactors) {
			const { error: unenrollError } = await supabase.auth.mfa.unenroll({
				factorId: factor.id,
			});
			if (unenrollError) {
				console.error('[MFA] enrollMfa unenroll stale factor failed:', unenrollError.message);
			}
		}

		const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
		if (error?.message?.includes('already exists')) {
			const { data: retryExisting } = await supabase.auth.mfa.listFactors();
			for (const factor of retryExisting?.all ?? []) {
				if (factor.factor_type === 'totp') {
					await supabase.auth.mfa.unenroll({ factorId: factor.id });
				}
			}
			const { data: retryData, error: retryError } = await supabase.auth.mfa.enroll({
				factorType: 'totp',
			});
			if (retryError) {
				console.error('[MFA] enrollMfa retry failed:', retryError.message);
				return { data: null, error: retryError.message };
			}
			return { data: { id: retryData.id, qrCode: retryData.totp.qr_code }, error: null };
		}
		if (error) {
			console.error('[MFA] enrollMfa failed:', error.message);
			return { data: null, error: error.message };
		}
		return { data: { id: data.id, qrCode: data.totp.qr_code }, error: null };
	},

	async challengeMfa(
		factorId: string,
	): Promise<{ data: { id: string } | null; error: string | null }> {
		const { data, error } = await supabase.auth.mfa.challenge({ factorId });
		if (error) {
			console.error('[MFA] challengeMfa failed:', error.message);
			return { data: null, error: error.message };
		}
		return { data: { id: data.id }, error: null };
	},

	async verifyMfaChallenge(
		factorId: string,
		challengeId: string,
		code: string,
	): Promise<{ error: string | null }> {
		const { error } = await supabase.auth.mfa.verify({
			factorId,
			challengeId,
			code,
		});
		if (error) {
			console.error('[MFA] verifyMfaChallenge failed:', error.message);
			return { error: error.message };
		}
		return { error: null };
	},

	async waitForAal2(): Promise<{ error: string | null }> {
		for (let attempt = 0; attempt < 10; attempt++) {
			const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
			if (error) {
				console.error('[MFA] waitForAal2 failed:', error.message);
				return { error: error.message };
			}
			if (data?.currentLevel === 'aal2') {
				return { error: null };
			}
			if (attempt < 9) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
		return { error: 'Session upgrade timed out' };
	},

	async listMfaFactors(): Promise<{
		data: {
			all: Array<{ id: string; status: string; friendly_name: string | null; factor_type: string }>;
			totp: Array<{
				id: string;
				status: string;
				friendly_name: string | null;
				factor_type: string;
			}>;
		} | null;
		error: string | null;
	}> {
		const { data, error } = await supabase.auth.mfa.listFactors();
		if (error) {
			console.error('[MFA] listMfaFactors failed:', error.message);
			return { data: null, error: error.message };
		}
		return {
			data: {
				all: data.all as Array<{
					id: string;
					status: string;
					friendly_name: string | null;
					factor_type: string;
				}>,
				totp: data.totp as Array<{
					id: string;
					status: string;
					friendly_name: string | null;
					factor_type: string;
				}>,
			},
			error: null,
		};
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
