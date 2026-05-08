'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/features/auth/authService';

const personalSchema = z.object({
	full_name: z.string().trim().min(2, DICT.COMMON.VALIDATION.NAME_MIN),
	email: z.email(DICT.COMMON.VALIDATION.EMAIL_INVALID).trim(),
});

type PersonalFormValues = z.infer<typeof personalSchema>;

export function PersonalInfoForm() {
	const dict = DICT.ACCOUNT;
	const { user, profile, refreshProfile } = useAuth();

	const form = useForm<PersonalFormValues>({
		resolver: zodResolver(personalSchema),
		defaultValues: {
			full_name: profile?.full_name || '',
			email: user?.email || '',
		},
	});

	const onSubmit = async (values: PersonalFormValues) => {
		if (!user?.id) {
			return;
		}
		if (values.email !== user.email) {
			const { error: emailErr } = await authService.updateEmail(values.email);
			if (emailErr) {
				toast.error(emailErr);
				return;
			}
			toast.info(dict.TOASTS.EMAIL_PENDING);
		}
		const { error } = await authService.updateProfile(user.id, {
			full_name: values.full_name,
		});
		if (error) {
			toast.error(error);
		} else {
			toast.success(dict.TOASTS.UPDATE_SUCCESS);
			await refreshProfile();
		}
	};

	return (
		<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<Controller
					control={form.control}
					name="full_name"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{dict.LABELS.FULL_NAME}
							</FieldLabel>
							<Input {...field} aria-invalid={!!fieldState.error} />
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field className="space-y-1.5">
							<FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								{dict.LABELS.EMAIL}
							</FieldLabel>
							<Input {...field} type="email" aria-invalid={!!fieldState.error} />
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>
			</div>
			<Button className="font-medium" disabled={form.formState.isSubmitting}>
				{form.formState.isSubmitting && <Loader2 className="mr-1 size-4 animate-spin" />}
				{dict.LABELS.SAVE_CHANGES}
			</Button>
		</form>
	);
}
