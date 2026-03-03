'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { DICT } from '@/dictionary';
import { authService } from '@/lib/authService';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
	email: z.email(DICT.VALIDATION.EMAIL_INVALID).trim(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const [isSent, setIsSent] = useState(false);
	const form = useForm<ForgotPasswordFormValues>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: { email: '' },
	});

	const onSubmit = async (data: ForgotPasswordFormValues) => {
		const { error } = await authService.resetPassword(data.email);

		if (error) {
			toast.error(error);
			return;
		}

		setIsSent(true);
		toast.success(DICT.AUTH.FORGOT_PASSWORD.SUCCESS_TOAST, { duration: 3000 });
	};

	if (isSent) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-2xl font-bold">{DICT.AUTH.FORGOT_PASSWORD.SENT_TITLE}</h1>
				<p className="text-muted-foreground">{DICT.AUTH.FORGOT_PASSWORD.SENT_DESCRIPTION}</p>
				<Link to="/login" className="block text-sm underline">
					{DICT.AUTH.FORGOT_PASSWORD.RETURN_LOGIN}
				</Link>
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
					<h1 className="text-2xl font-bold">{DICT.AUTH.FORGOT_PASSWORD.TITLE}</h1>
					<p className="text-sm text-muted-foreground text-balance">
						{DICT.AUTH.FORGOT_PASSWORD.DESCRIPTION}
					</p>
				</div>

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
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Field>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.FORGOT_PASSWORD.SUBMITTING_LABEL
							: DICT.AUTH.FORGOT_PASSWORD.SUBMIT_LABEL}
					</Button>
				</Field>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						{DICT.AUTH.FORGOT_PASSWORD.REMEMBER_PASSWORD}{' '}
						<Link to="/login" className="underline underline-offset-4">
							{DICT.AUTH.LOGIN.SUBMIT_LABEL}
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
