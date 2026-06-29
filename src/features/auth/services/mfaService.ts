import type { MfaStatus } from '@/features/auth/types';
import { supabase } from '@/lib/supabaseClient';

export const MFA_ISSUER = 'FreshersCo';

export type EnrollMfaResult = {
	id: string;
	qrCode: string;
	secret: string;
	uri: string;
};

export const mfaService = {
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
		data: EnrollMfaResult | null;
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
			return {
				data: {
					id: retryData.id,
					qrCode: retryData.totp.qr_code,
					secret: retryData.totp.secret,
					uri: retryData.totp.uri,
				},
				error: null,
			};
		}
		if (error) {
			console.error('[MFA] enrollMfa failed:', error.message);
			return { data: null, error: error.message };
		}
		return {
			data: {
				id: data.id,
				qrCode: data.totp.qr_code,
				secret: data.totp.secret,
				uri: data.totp.uri,
			},
			error: null,
		};
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
};
