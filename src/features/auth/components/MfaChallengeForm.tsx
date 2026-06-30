'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { mfaService } from '@/features/auth/services/mfaService';
import { cn } from '@/lib/utils';

const challengeSchema = z.object({
	code: z
		.string()
		.length(6, 'Code must be exactly 6 digits')
		.regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

type ChallengeFormValues = z.infer<typeof challengeSchema>;

interface MfaChallengeFormProps {
	onComplete: () => void;
}

export function MfaChallengeForm({ onComplete }: MfaChallengeFormProps) {
	const dict = DICT.AUTH.MFA.CHALLENGE;

	const form = useForm<ChallengeFormValues>({
		resolver: zodResolver(challengeSchema),
		defaultValues: { code: '' },
	});

	const onSubmit = async (values: ChallengeFormValues) => {
		const { data: factors, error: listError } = await mfaService.listMfaFactors();
		if (listError || !factors?.totp?.length) {
			console.error('[MFA] Challenge listFactors failed:', listError);
			toast.error(dict.ERROR);
			return;
		}

		const totpFactor = factors.totp[0];
		if (!totpFactor) {
			toast.error(dict.ERROR);
			return;
		}
		const factorId = totpFactor.id;

		const { data: challengeData, error: challengeError } = await mfaService.challengeMfa(factorId);
		if (challengeError || !challengeData) {
			console.error('[MFA] Challenge failed:', challengeError);
			toast.error(dict.ERROR);
			return;
		}

		const { error: verifyError } = await mfaService.verifyMfaChallenge(
			factorId,
			challengeData.id,
			values.code,
		);
		if (verifyError) {
			console.error('[MFA] Verify failed:', verifyError);
			toast.error(dict.ERROR);
			return;
		}

		const { error: aalError } = await mfaService.waitForAal2();
		if (aalError) {
			console.error('[MFA] AAL2 not confirmed after challenge verify:', aalError);
		}

		toast.success(dict.TOAST_SUCCESS);
		onComplete();
	};

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">{dict.MESSAGE}</p>

			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<Controller
					control={form.control}
					name="code"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel>{dict.LABEL_CODE}</FieldLabel>
							<div className="flex gap-2">
								<Input
									{...field}
									type="text"
									inputMode="numeric"
									maxLength={6}
									placeholder={dict.PLACEHOLDER_CODE}
									aria-invalid={!!fieldState.error}
									className={cn('flex-1', fieldState.error ? 'border-destructive' : '')}
								/>
								<Button type="submit" className="shrink-0" disabled={form.formState.isSubmitting}>
									{form.formState.isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
									{form.formState.isSubmitting ? dict.BUTTON_VERIFYING : dict.BUTTON_VERIFY}
								</Button>
							</div>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
			</form>
		</div>
	);
}
