'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { MFA_ISSUER, mfaService } from '@/features/auth/services/mfaService';

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
	const { profile } = useAuth();
	const dict = DICT.AUTH.MFA.ENROLLMENT;
	const [qrCode, setQrCode] = useState('');
	const [factorId, setFactorId] = useState('');
	const [secret, setSecret] = useState('');
	const [_uri, setUri] = useState('');
	const [initialising, setInitialising] = useState(true);
	const [copiedField, setCopiedField] = useState<string | null>(null);

	const form = useForm<VerifyFormValues>({
		resolver: zodResolver(verifySchema),
		defaultValues: { code: '' },
	});

	const initEnrollment = useCallback(async () => {
		setInitialising(true);
		setQrCode('');
		setFactorId('');
		setSecret('');
		setUri('');

		const { data, error: enrollError } = await mfaService.enrollMfa();
		if (enrollError || !data) {
			toast.error(enrollError || dict.ERROR_ENROLL);
			setInitialising(false);
			return;
		}
		setQrCode(data.qrCode);
		setFactorId(data.id);
		setSecret(data.secret);
		setUri(data.uri);
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

	const copyToClipboard = async (text: string, fieldName: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedField(fieldName);
			toast.success(dict.COPIED_TOAST);
			setTimeout(() => setCopiedField(null), 2000);
		} catch {
			setCopiedField(null);
		}
	};

	const manualFields = [
		{ key: 'issuer', label: dict.ISSUER_LABEL, value: MFA_ISSUER },
		{ key: 'account', label: dict.ACCOUNT_LABEL, value: profile?.email ?? '' },
		{ key: 'secret', label: dict.SECRET_LABEL, value: secret },
	];

	const onSubmit = async (values: VerifyFormValues) => {
		const { data: challengeData, error: challengeError } = await mfaService.challengeMfa(factorId);
		if (challengeError || !challengeData) {
			console.error('[MFA] Challenge failed:', challengeError);
			toast.error(dict.ERROR_VERIFY);
			return;
		}

		const { error: verifyError } = await mfaService.verifyMfaChallenge(
			factorId,
			challengeData.id,
			values.code,
		);
		if (verifyError) {
			console.error('[MFA] Verify failed:', verifyError);
			toast.error(dict.ERROR_VERIFY);
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
		return <Loading absolute={false} />;
	}

	if (!qrCode) {
		return (
			<div className="space-y-6">
				<p className="text-sm text-muted-foreground">{dict.MANDATORY_MESSAGE}</p>

				<Button type="button" className="w-full" onClick={initEnrollment}>
					Try Again
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<p className="text-sm text-muted-foreground">{dict.MANDATORY_MESSAGE}</p>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
				<div className="flex items-end gap-2">
					<Controller
						control={form.control}
						name="code"
						render={({ field, fieldState }) => (
							<Field className="flex-1 space-y-1.5">
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

					<Button type="submit" className="shrink-0" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
						{form.formState.isSubmitting ? dict.BUTTON_VERIFYING : dict.BUTTON_VERIFY}
					</Button>
				</div>
			</form>
			<div className="flex justify-center">
				<img src={qrCode} alt="QR Code" className="size-48" />
			</div>

			<p className="text-sm text-muted-foreground text-center">{dict.QR_INSTRUCTION}</p>

			<div className="relative">
				<div className="relative flex justify-center text-sm">
					<span className="px-2 text-muted-foreground">{dict.MANUAL_ENTRY_TITLE}</span>
				</div>
			</div>

			<div className="rounded-lg border p-4 space-y-3">
				{manualFields.map((field) => {
					const isCopied = copiedField === field.key;
					return (
						<div key={field.key} className="flex items-center gap-2">
							<div className="flex-1 min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{field.label}
								</p>
								<p className="mt-0.5 truncate font-mono text-sm font-medium tabular-nums">
									{field.value}
								</p>
							</div>
							<Button
								type="button"
								variant="outline"
								size="icon"
								className="shrink-0"
								onClick={() => copyToClipboard(field.value, field.key)}
								aria-label={`Copy ${field.label}`}>
								{isCopied ? (
									<Check className="size-4 text-green-500" />
								) : (
									<Copy className="size-4" />
								)}
							</Button>
						</div>
					);
				})}
			</div>
		</div>
	);
}
