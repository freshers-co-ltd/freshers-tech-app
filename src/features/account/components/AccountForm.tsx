'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/features/auth/authService';

const personalSchema = z.object({
	full_name: z.string().trim().min(2, DICT.FORMS.VALIDATION.NAME_MIN),
	email: z.email(DICT.FORMS.VALIDATION.EMAIL_INVALID).trim(),
});

const securitySchema = z
	.object({
		currentPassword: z.string().min(1, 'Current password is required'),
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

type PersonalFormValues = z.infer<typeof personalSchema>;
type SecurityFormValues = z.infer<typeof securitySchema>;

interface AccountFormProps {
	type: 'personal' | 'security';
}

export function AccountForm({ type }: AccountFormProps) {
	const { user, profile } = useAuth();

	const personalForm = useForm<PersonalFormValues>({
		resolver: zodResolver(personalSchema),
		defaultValues: {
			full_name: profile?.full_name || '',
			email: user?.email || '',
		},
	});

	const securityForm = useForm<SecurityFormValues>({
		resolver: zodResolver(securitySchema),
		defaultValues: {
			currentPassword: '',
			password: '',
			confirmPassword: '',
		},
	});

	const onPersonalSubmit = async (values: PersonalFormValues) => {
		if (!user?.id) {
			return;
		}
		if (values.email !== user.email) {
			const { error: emailErr } = await authService.updateEmail(values.email);
			if (emailErr) {
				toast.error(emailErr);
				return;
			}
			toast.info(DICT.ACCOUNT.NOTIFICATIONS.EMAIL_PENDING);
		}
		const { error } = await authService.updateProfile(user.id, {
			full_name: values.full_name,
		});
		if (error) {
			toast.error(error);
		} else {
			toast.success(DICT.ACCOUNT.NOTIFICATIONS.UPDATE_SUCCESS);
		}
	};

	const onSecuritySubmit = async (values: SecurityFormValues) => {
		const { error: authError } = await authService.reauthenticate(values.currentPassword);
		if (authError) {
			toast.error('Current password incorrect');
			return;
		}
		const { error } = await authService.updatePassword(values.password);
		if (error) {
			toast.error(error);
		} else {
			toast.success(DICT.ACCOUNT.NOTIFICATIONS.PASSWORD_SUCCESS);
			securityForm.reset();
		}
	};

	if (type === 'personal') {
		return (
			<form onSubmit={personalForm.handleSubmit(onPersonalSubmit)} className="space-y-6">
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						control={personalForm.control}
						name="full_name"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.FULL_NAME}
								</FieldLabel>
								<Input {...field} aria-invalid={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
					<Controller
						control={personalForm.control}
						name="email"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.EMAIL}
								</FieldLabel>
								<Input {...field} type="email" aria-invalid={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
				</div>
				<Button className="font-medium" disabled={personalForm.formState.isSubmitting}>
					{personalForm.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
					{DICT.ACCOUNT.LABELS.SAVE_CHANGES}
				</Button>
			</form>
		);
	}

	return (
		<form onSubmit={securityForm.handleSubmit(onSecuritySubmit)} className="space-y-6">
			<div className="grid grid-cols-1 gap-4">
				<Controller
					control={securityForm.control}
					name="currentPassword"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Current Password
							</FieldLabel>
							<PasswordInput {...field} error={!!fieldState.error} />
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<Controller
						control={securityForm.control}
						name="password"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.NEW_PASSWORD}
								</FieldLabel>
								<PasswordInput {...field} error={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
					<Controller
						control={securityForm.control}
						name="confirmPassword"
						render={({ field, fieldState }) => (
							<Field className="space-y-1.5">
								<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									{DICT.ACCOUNT.LABELS.CONFIRM_PASSWORD}
								</FieldLabel>
								<PasswordInput {...field} error={!!fieldState.error} />
								{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							</Field>
						)}
					/>
				</div>
			</div>
			<Button className="font-medium" disabled={securityForm.formState.isSubmitting}>
				{securityForm.formState.isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
				{DICT.ACCOUNT.LABELS.UPDATE_PASSWORD}
			</Button>
		</form>
	);
}
