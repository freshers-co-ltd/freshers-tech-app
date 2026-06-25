'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/services/authService';
import { VerifyOtpForm } from '@/features/auth/components/VerifyOtpForm';
import type { AuthActionResult, UserRole } from '@/features/auth/types';
import { cn } from '@/lib/utils';

const signupSchema = z
	.object({
		name: z
			.string()
			.trim()
			.min(2, DICT.COMMON.VALIDATION.NAME_MIN)
			.max(50, DICT.COMMON.VALIDATION.NAME_MAX),
		email: z.email(DICT.COMMON.VALIDATION.EMAIL_INVALID).trim(),
		password: z
			.string()
			.min(8, DICT.COMMON.VALIDATION.PASSWORD_MIN)
			.regex(/[A-Z]/, { message: DICT.COMMON.VALIDATION.PASSWORD_UPPERCASE })
			.regex(/[0-9]/, { message: DICT.COMMON.VALIDATION.PASSWORD_NUMBER })
			.regex(/[^a-zA-Z0-9]/, { message: DICT.COMMON.VALIDATION.PASSWORD_SPECIAL }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: DICT.COMMON.VALIDATION.PASSWORDS_MATCH,
		path: ['confirmPassword'],
	});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps extends React.ComponentProps<'form'> {
	selectedRole: UserRole;
}

export function SignupForm({ className, selectedRole, ...props }: SignupFormProps) {
	const navigate = useNavigate();
	const [step, setStep] = useState<'signup' | 'verify'>('signup');

	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
	});

	const onSignupSubmit = async (values: SignupFormValues) => {
		const { error, user, needsConfirmation } = (await Promise.race([
			authService.signUp({
				email: values.email,
				password: values.password,
				full_name: values.name,
				role: selectedRole,
			}),
		])) as AuthActionResult;

		if (error) {
			toast.error(error);
			return;
		}

		if (needsConfirmation) {
			setStep('verify');
			toast.success(DICT.AUTH.SIGNUP.VERIFICATION.TOAST_SUCCESS, { duration: 3000 });
		} else if (user) {
			toast.success(DICT.AUTH.SIGNUP.TOAST_SUCCESS, { duration: 3000 });
			navigate('/dashboard');
		}
	};

	if (step === 'verify') {
		return (
			<VerifyOtpForm email={form.getValues('email')} onBackToSignup={() => setStep('signup')} />
		);
	}

	return (
		<form
			className={cn('flex flex-col gap-4', className)}
			onSubmit={form.handleSubmit(onSignupSubmit)}
			{...props}>
			<FieldGroup>
				<Controller
					control={form.control}
					name="name"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="name">{DICT.COMMON.LABELS.NAME}</FieldLabel>
							<Input
								{...field}
								id="name"
								type="text"
								placeholder={DICT.COMMON.PLACEHOLDERS.NAME}
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="email">{DICT.COMMON.LABELS.EMAIL}</FieldLabel>
							<Input
								{...field}
								id="email"
								type="email"
								autoComplete="email"
								placeholder={DICT.COMMON.PLACEHOLDERS.EMAIL}
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="password"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="password">{DICT.COMMON.LABELS.PASSWORD}</FieldLabel>
							<PasswordInput
								{...field}
								id="password"
								autoComplete="new-password"
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{!fieldState.error && (
								<FieldDescription>{DICT.COMMON.VALIDATION.PASSWORD_HINT}</FieldDescription>
							)}
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="confirmPassword"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="confirm-password">
								{DICT.COMMON.LABELS.CONFIRM_PASSWORD}
							</FieldLabel>
							<PasswordInput
								{...field}
								id="confirm-password"
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<div className="flex flex-col gap-4 mt-2">
					<p className="text-center text-sm text-muted-foreground">
						{DICT.AUTH.PRIVACY.PRIVACY_NOTICE_LABEL}{' '}
						<a href="/privacy" target="_blank" rel="noopener noreferrer" className="link">
							{DICT.AUTH.PRIVACY.PRIVACY_NOTICE_LINK}
						</a>
					</p>
					<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.SIGNUP.BUTTON_SUBMITTING
							: DICT.AUTH.SIGNUP.BUTTON_SUBMIT}
					</Button>
					<FieldDescription className="text-center">
						{DICT.AUTH.SIGNUP.LABEL_HAVE_ACCOUNT}{' '}
						<Link to="/" className="link">
							{DICT.AUTH.SIGNUP.LINK_LOGIN}
						</Link>
					</FieldDescription>
				</div>
			</FieldGroup>
		</form>
	);
}
