'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { authService } from '@/lib/authService';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
	.object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
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
			<div className="flex flex-col items-center gap-4 text-center py-6">
				<h1 className="text-2xl font-bold">{DICT.AUTH.RESET_PASSWORD.SUCCESS_TITLE}</h1>
				<p className="text-muted-foreground">{DICT.AUTH.RESET_PASSWORD.SUCCESS_DESCRIPTION}</p>
				<Button asChild className="w-full">
					<Link to="/dashboard">{DICT.AUTH.RESET_PASSWORD.DASHBOARD_LINK}</Link>
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
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{DICT.AUTH.RESET_PASSWORD.TITLE}</h1>
				</div>

				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="password">
								{DICT.AUTH.RESET_PASSWORD.NEW_PASSWORD_LABEL}
							</FieldLabel>
							<Input
								{...field}
								id="password"
								type="password"
								placeholder={DICT.AUTH.PLACEHOLDERS.PASSWORD}
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Controller
					name="confirmPassword"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field data-invalid={fieldState.invalid}>
							<FieldLabel htmlFor="confirmPassword">
								{DICT.AUTH.RESET_PASSWORD.CONFIRM_PASSWORD_LABEL}
							</FieldLabel>
							<Input
								{...field}
								id="confirmPassword"
								type="password"
								placeholder={DICT.AUTH.PLACEHOLDERS.PASSWORD}
								aria-invalid={fieldState.invalid}
							/>
							{fieldState.invalid && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>

				<Button type="submit" disabled={form.formState.isSubmitting}>
					{form.formState.isSubmitting
						? DICT.AUTH.RESET_PASSWORD.SUBMITTING_LABEL
						: DICT.AUTH.RESET_PASSWORD.SUBMIT_LABEL}
				</Button>
			</FieldGroup>
		</form>
	);
}
