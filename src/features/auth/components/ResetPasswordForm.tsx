'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/authService';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, DICT.FORMS.VALIDATION.PASSWORD_MIN)
			.regex(/[0-9]/, { message: DICT.FORMS.VALIDATION.PASSWORD_NUMBER })
			.regex(/[^a-zA-Z0-9]/, { message: DICT.FORMS.VALIDATION.PASSWORD_SPECIAL }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: DICT.FORMS.VALIDATION.PASSWORDS_MATCH,
		path: ['confirmPassword'],
	});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();
	const [isSuccess, setIsSuccess] = useState(false);
	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
	});

	const onSubmit = async (data: ResetPasswordFormValues) => {
		const { error } = await authService.updatePassword(data.password);

		if (error) {
			toast.error(error);
			return;
		}

		setIsSuccess(true);
		toast.success(DICT.AUTH.RESET_PASSWORD.SUCCESS_TOAST, { duration: 3000 });
	};

	if (isSuccess) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.AUTH.RESET_PASSWORD.SUCCESS_TITLE}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.RESET_PASSWORD.SUCCESS_MESSAGE}</p>
				<Button variant="default" onClick={() => navigate('/dashboard')}>
					{DICT.AUTH.RESET_PASSWORD.DASHBOARD_BUTTON}
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
				<p className="text-muted-foreground text-balance text-center">
					{DICT.AUTH.RESET_PASSWORD.MESSAGE}
				</p>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field>
							{' '}
							<FieldLabel htmlFor="password"> {DICT.FORMS.LABELS.NEW_PASSWORD} </FieldLabel>{' '}
							<PasswordInput
								{...field}
								id="password"
								autoComplete="new-password"
								placeholder={DICT.FORMS.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>{' '}
							{fieldState.error && <FieldError errors={[fieldState.error]} />}{' '}
						</Field>
					)}
				/>{' '}
				<Controller
					name="confirmPassword"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field>
							{' '}
							<FieldLabel htmlFor="confirmPassword">
								{' '}
								{DICT.FORMS.LABELS.CONFIRM_PASSWORD}{' '}
							</FieldLabel>{' '}
							<PasswordInput
								{...field}
								id="confirmPassword"
								placeholder={DICT.FORMS.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>{' '}
							{fieldState.error && <FieldError errors={[fieldState.error]} />}{' '}
						</Field>
					)}
				/>
				<Button type="submit" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting
						? DICT.AUTH.RESET_PASSWORD.SUBMITTING_BUTTON
						: DICT.AUTH.RESET_PASSWORD.SUBMIT_BUTTON}
				</Button>
			</FieldGroup>
		</form>
	);
}

ResetPasswordForm.title = DICT.AUTH.RESET_PASSWORD.TITLE;
