'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { mfaService } from '@/features/auth/services/mfaService';

const verifySchema = z.object({
	code: z
		.string()
		.length(6, 'Code must be exactly 6 digits')
		.regex(/^\d{6}$/, 'Code must be exactly 6 digits'),
});

type VerifyFormValues = z.infer<typeof verifySchema>;

interface MfaEnrollmentFormProps {
	onComplete: () => void;
}

export function MfaEnrollmentForm({ onComplete }: MfaEnrollmentFormProps) {
	const dict = DICT.AUTH.MFA.ENROLLMENT;
	const [qrCode, setQrCode] = useState('');
	const [factorId, setFactorId] = useState('');
	const [error, setError] = useState('');
	const [initialising, setInitialising] = useState(true);

	const form = useForm<VerifyFormValues>({
		resolver: zodResolver(verifySchema),
		defaultValues: { code: '' },
	});

	const initEnrollment = useCallback(async () => {
		setInitialising(true);
		setError('');
		setQrCode('');
		setFactorId('');

		const { data, error: enrollError } = await mfaService.enrollMfa();
		if (enrollError || !data) {
			setError(enrollError || dict.ERROR_ENROLL);
			setInitialising(false);
			return;
		}
		setQrCode(data.qrCode);
		setFactorId(data.id);
		setInitialising(false);
	}, [dict.ERROR_ENROLL]);

	const initCalledRef = useRef(false);

	useEffect(() => {
		if (initCalledRef.current) {
			return;
		}
		initCalledRef.current = true;
		initEnrollment();
	}, [initEnrollment]);

	const onSubmit = async (values: VerifyFormValues) => {
		setError('');
		const { data: challengeData, error: challengeError } = await mfaService.challengeMfa(factorId);
		if (challengeError || !challengeData) {
			console.error('[MFA] Challenge failed:', challengeError);
			setError(dict.ERROR_VERIFY);
			return;
		}

		const { error: verifyError } = await mfaService.verifyMfaChallenge(
			factorId,
			challengeData.id,
			values.code,
		);
		if (verifyError) {
			console.error('[MFA] Verify failed:', verifyError);
			setError(dict.ERROR_VERIFY);
			return;
		}

		const { error: aalError } = await mfaService.waitForAal2();
		if (aalError) {
			console.error('[MFA] AAL2 not confirmed after verify:', aalError);
		}

		toast.success(dict.SUCCESS_TOAST);
		onComplete();
	};

	if (initialising) {
		return (
			<div className="flex flex-col items-center gap-4 py-8">
				<Loader2 className="size-8 animate-spin text-muted-foreground" />
				<p className="text-sm text-muted-foreground">{dict.LOADING}</p>
			</div>
		);
	}

	if (!qrCode) {
		return (
			<div className="space-y-6">
				<p className="text-sm text-muted-foreground">{dict.MANDATORY_MESSAGE}</p>

				{error && (
					<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
				)}

				<Button type="button" className="w-full" onClick={initEnrollment}>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">{dict.MANDATORY_MESSAGE}</p>

			{error && (
				<div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
			)}

			<div className="flex justify-center">
				<img src={qrCode} alt="QR Code" className="size-48" />
			</div>

			<p className="text-sm text-muted-foreground text-center">{dict.QR_INSTRUCTION}</p>

			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<Controller
					control={form.control}
					name="code"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{dict.CODE_LABEL}
							</FieldLabel>
							<Input
								{...field}
								type="text"
								inputMode="numeric"
								maxLength={6}
								placeholder={dict.CODE_PLACEHOLDER}
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
					{form.formState.isSubmitting ? dict.BUTTON_VERIFYING : dict.BUTTON_VERIFY}
				</Button>
			</form>
		</div>
	);
}
