'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
import { authService } from '@/features/auth/authService';
import { cn } from '@/lib/utils';

const forgotPasswordSchema = z.object({
	email: z.email(DICT.COMMON.VALIDATION.EMAIL_INVALID).trim(),
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();
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
				<h1 className="text-xl font-bold capitalize">{DICT.AUTH.FORGOT_PASSWORD.SENT_TITLE}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.FORGOT_PASSWORD.SENT_MESSAGE}</p>
				<Button variant="default" onClick={() => navigate('/login')}>
					{DICT.AUTH.FORGOT_PASSWORD.BACK_BUTTON}
				</Button>
			</div>
		);
	}

	return (
		<form
			className={cn('flex flex-col flex-1', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup className="flex-1 flex flex-col justify-around">
				<p className="text-muted-foreground text-balance text-center">
					{DICT.AUTH.FORGOT_PASSWORD.MESSAGE}
				</p>

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

				<Field>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.FORGOT_PASSWORD.SUBMITTING
							: DICT.AUTH.FORGOT_PASSWORD.SUBMIT}
					</Button>
				</Field>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						{DICT.AUTH.FORGOT_PASSWORD.REMEMBER_LINK}{' '}
						<Link to="/login" className="underline underline-offset-4">
							{DICT.AUTH.LOGIN.SUBMIT_BUTTON}
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}

ForgotPasswordForm.title = DICT.AUTH.FORGOT_PASSWORD.TITLE;
