'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import * as z from 'zod';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/authService';

const securitySchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
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

type SecurityFormValues = z.infer<typeof securitySchema>;

export function SecurityForm() {
	const dict = DICT.ACCOUNT.SECURITY;

	const form = useForm<SecurityFormValues>({
		resolver: zodResolver(securitySchema),
		defaultValues: {
			currentPassword: '',
			password: '',
			confirmPassword: '',
		},
	});

	const onSubmit = async (values: SecurityFormValues) => {
		const { error: authError } = await authService.reauthenticate(values.currentPassword);
		if (authError) {
			toast.error(dict.TOAST_ERROR);
			return;
		}
		const { error } = await authService.updatePassword(values.password);
		if (error) {
			toast.error(error);
		} else {
			toast.success(dict.TOAST_SUCCESS);
			form.reset();
		}
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 gap-4">
				<Controller
					control={form.control}
					name="currentPassword"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{dict.LABEL_CURRENT_PASSWORD}
							</FieldLabel>
							<PasswordInput
								{...field}
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						control={form.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{dict.LABEL_NEW_PASSWORD}
								</FieldLabel>
								<PasswordInput
									{...field}
									placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
									error={!!fieldState.error}
								/>
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
					<Controller
						control={form.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{dict.LABEL_CONFIRM_PASSWORD}
								</FieldLabel>
								<PasswordInput
									{...field}
									placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
									error={!!fieldState.error}
								/>
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
				</div>
			</div>
			<Button className="font-medium" disabled={form.formState.isSubmitting}>
				{form.formState.isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
				{dict.BUTTON_SUBMIT}
			</Button>
		</form>
	);
}
