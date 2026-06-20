'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/authService';
import type { AuthActionResult, UserRole } from '@/features/auth/types';
import { cn } from '@/lib/utils';

const signupSchema = z
	.object({
		name: z.string().trim().min(2, DICT.COMMON.VALIDATION.NAME_MIN),
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

const otpSchema = z.object({
	token: z.string().length(6, 'Code must be 6 digits'),
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps extends React.ComponentProps<'form'> {
	selectedRole: UserRole;
}

export function SignupForm({ className, selectedRole, ...props }: SignupFormProps) {
	const navigate = useNavigate();
	const [step, setStep] = useState<'signup' | 'verify'>('signup');
	const [resendCooldown, setResendCooldown] = useState(0);

	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
	});

	const otpForm = useForm<{ token: string }>({
		resolver: zodResolver(otpSchema),
		defaultValues: { token: '' },
	});

	useEffect(() => {
		if (resendCooldown > 0) {
			const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
			return () => clearTimeout(timer);
		}
	}, [resendCooldown]);

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

	const onVerifySubmit = async (data: { token: string }) => {
		const email = form.getValues('email');
		const { error } = await authService.verifyOtp(email, data.token);

		if (error) {
			toast.error(error);
			return;
		}

		toast.success(DICT.AUTH.SIGNUP.TOAST_SUCCESS, { duration: 3000 });
		navigate('/dashboard');
	};

	const handleResendCode = async () => {
		if (resendCooldown > 0) {
			return;
		}

		const { error } = await authService.resendSignupConfirmation(form.getValues('email'));
		if (error) {
			toast.error(error);
		} else {
			setResendCooldown(60);
			toast.success(DICT.AUTH.SIGNUP.VERIFICATION.TOAST_NEW_CODE, { duration: 3000 });
		}
	};

	if (step === 'verify') {
		return (
			<div className="space-y-6 duration-300 animate-in fade-in slide-in-from-right-4">
				<div className="space-y-2 text-center">
					<h1 className="text-2xl font-bold">{DICT.AUTH.SIGNUP.VERIFICATION.TITLE}</h1>
					<p className="text-sm text-muted-foreground">
						{DICT.AUTH.SIGNUP.VERIFICATION.MESSAGE} <br />
						<span className="font-semibold text-foreground">{form.getValues('email')}</span>
					</p>
				</div>

				<form onSubmit={otpForm.handleSubmit(onVerifySubmit)} className="space-y-4">
					<Controller
						control={otpForm.control}
						name="token"
						render={({ field, fieldState }) => (
							<Field className="flex-col-center gap-2">
								<InputOTP
									maxLength={6}
									pattern={'^[0-9]+$'}
									value={field.value}
									onChange={field.onChange}
									containerClassName="flex justify-center items-center w-full">
									<InputOTPGroup>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={0}
										/>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={1}
										/>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={2}
										/>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={3}
										/>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={4}
										/>
										<InputOTPSlot
											className="size-10 text-lg sm:text-2xl sm:h-14 sm:w-14"
											index={5}
										/>
									</InputOTPGroup>
								</InputOTP>
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>

					<Button type="submit" className="w-full" disabled={otpForm.formState.isSubmitting}>
						{otpForm.formState.isSubmitting
							? DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_SUBMITTING
							: DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_SUBMIT}
					</Button>
				</form>

				<div className="flex flex-col gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleResendCode}
						disabled={resendCooldown > 0}>
						{resendCooldown > 0
							? `${DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_RESEND_WAIT} ${resendCooldown}s`
							: DICT.AUTH.SIGNUP.VERIFICATION.BUTTON_RESEND}
					</Button>
					<div className="text-center text-sm text-muted-foreground">
						<span>{DICT.AUTH.SIGNUP.VERIFICATION.LABEL_WRONG_EMAIL}</span>
						<Button
							variant="link"
							size="sm"
							onClick={() => setStep('signup')}
							className="p-1 text-muted-foreground underline font-normal hover:text-primary hover:scale-100">
							{DICT.AUTH.SIGNUP.VERIFICATION.LINK_CHANGE_EMAIL}
						</Button>
					</div>
				</div>
			</div>
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
