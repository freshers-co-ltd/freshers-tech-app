'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { type AuthActionResult, authService, type UserRole } from '@/lib/authService';
import { cn } from '@/lib/utils';

const signupSchema = z
	.object({
		name: z.string().trim().min(2, DICT.VALIDATION.NAME_MIN),
		email: z.email(DICT.VALIDATION.EMAIL_INVALID).trim(),
		password: z
			.string()
			.min(8, DICT.VALIDATION.PASSWORD_MIN)
			.regex(/[0-9]/, { message: DICT.VALIDATION.PASSWORD_NUMBER })
			.regex(/[^a-zA-Z0-9]/, { message: DICT.VALIDATION.PASSWORD_SPECIAL }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: DICT.VALIDATION.PASSWORDS_MATCH,
		path: ['confirmPassword'],
	});

type SignupFormValues = z.infer<typeof signupSchema>;

interface SignupFormProps extends React.ComponentProps<'form'> {
	selectedRole: UserRole;
}

export function SignupForm({ className, selectedRole, ...props }: SignupFormProps) {
	const navigate = useNavigate();
	const [isVerificationSent, setIsVerificationSent] = useState(false);
	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
	});

	const onSubmit = async (values: SignupFormValues) => {
		const timeout = new Promise((_, reject) =>
			setTimeout(() => reject(new Error('TIMEOUT')), 15000),
		);
		try {
			const { error, user, needsConfirmation } = (await Promise.race([
				authService.signUp({
					email: values.email,
					password: values.password,
					full_name: values.name,
					role: selectedRole,
				}),
				timeout,
			])) as AuthActionResult;

			if (error) {
				toast.error(error);
				return;
			}

			if (needsConfirmation) {
				setIsVerificationSent(true);
				toast.success(DICT.AUTH.SIGNUP.CONFIRMATION_TOAST, { duration: 3000 });
			} else if (user) {
				toast.success(DICT.AUTH.SIGNUP.SUCCESS_TOAST, { duration: 3000 });
				navigate('/dashboard');
			}
		} catch (err) {
			if (err instanceof Error && err.message === 'TIMEOUT') {
				toast.error(DICT.COMMON.ERROR_TIMEOUT);
			} else {
				console.error('Error:', err);
				toast.error(DICT.COMMON.ERROR_GENERIC);
			}
			return;
		} finally {
			form.reset(undefined, { keepValues: true });
		}
	};

	if (isVerificationSent) {
		return (
			<div className="text-center py-8 space-y-4">
				<h1 className="text-2xl font-bold">{DICT.AUTH.SIGNUP.VERIFICATION.TITLE}</h1>
				<p className="text-muted-foreground">
					{DICT.AUTH.SIGNUP.VERIFICATION.DESCRIPTION} <strong>{form.getValues('email')}</strong>.{' '}
					{DICT.AUTH.SIGNUP.VERIFICATION.DESCRIPTION_SUFFIX}
				</p>
				<Button variant="outline" onClick={() => setIsVerificationSent(false)}>
					{DICT.AUTH.SIGNUP.VERIFICATION.BACK_BUTTON}
				</Button>
			</div>
		);
	}

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup>
				<Controller
					control={form.control}
					name="name"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="name">{DICT.AUTH.LABELS.FULL_NAME}</FieldLabel>
							<Input
								{...field}
								id="name"
								type="text"
								placeholder={DICT.AUTH.PLACEHOLDERS.NAME}
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
							<FieldLabel htmlFor="email">{DICT.AUTH.LABELS.EMAIL}</FieldLabel>
							<Input
								{...field}
								id="email"
								type="email"
								placeholder={DICT.AUTH.PLACEHOLDERS.EMAIL}
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
							<FieldLabel htmlFor="password">{DICT.AUTH.LABELS.PASSWORD}</FieldLabel>
							<Input
								{...field}
								id="password"
								type="password"
								placeholder={DICT.AUTH.PLACEHOLDERS.PASSWORD}
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{!fieldState.error && (
								<FieldDescription>{DICT.VALIDATION.PASSWORD_HINT}</FieldDescription>
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
								{DICT.AUTH.LABELS.CONFIRM_PASSWORD}
							</FieldLabel>
							<Input
								{...field}
								id="confirm-password"
								type="password"
								placeholder={DICT.AUTH.PLACEHOLDERS.PASSWORD}
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<div className="flex flex-col gap-4 mt-2">
					<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.SIGNUP.SUBMITTING_LABEL
							: DICT.AUTH.SIGNUP.SUBMIT_LABEL}
					</Button>
					<FieldDescription className="text-center">
						{DICT.AUTH.SIGNUP.ALREADY_HAVE_ACCOUNT}{' '}
						<Link
							to="/"
							className="underline transition-colors underline-offset-4 decoration-muted-foreground hover:text-primary">
							{DICT.AUTH.SIGNUP.SIGNIN_LINK}
						</Link>
					</FieldDescription>
				</div>
			</FieldGroup>
		</form>
	);
}
