'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/authService';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

const setPasswordSchema = z
	.object({
		password: z
			.string()
			.min(8, DICT.COMMON.VALIDATION.PASSWORD_MIN)
			.regex(/[0-9]/, { message: DICT.COMMON.VALIDATION.PASSWORD_NUMBER })
			.regex(/[^a-zA-Z0-9]/, { message: DICT.COMMON.VALIDATION.PASSWORD_SPECIAL }),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: DICT.COMMON.VALIDATION.PASSWORDS_MATCH,
		path: ['confirmPassword'],
	});

type SetPasswordFormValues = z.infer<typeof setPasswordSchema>;

export function SetPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();
	const [searchParams] = useSearchParams();
	const [isSuccess, setIsSuccess] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);

	const token = useMemo(() => {
		return searchParams.get('token') || window.location.hash.split('token=')[1]?.split('&')[0];
	}, [searchParams]);

	const form = useForm<SetPasswordFormValues>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
	});

	const onSubmit = async (data: SetPasswordFormValues) => {
		if (!token) {
			toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
			return;
		}

		setIsProcessing(true);

		const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(token);

		if (exchangeError) {
			setIsProcessing(false);
			toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
			return;
		}

		const { error } = await authService.updatePassword(data.password);

		setIsProcessing(false);

		if (error) {
			toast.error(error);
			return;
		}

		setIsSuccess(true);
		toast.success(DICT.AUTH.SET_PASSWORD.SUCCESS_TOAST, { duration: 3000 });
	};

	if (isSuccess) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.AUTH.SET_PASSWORD.SUCCESS_TITLE}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.SET_PASSWORD.SUCCESS_MESSAGE}</p>
				<Button variant="default" onClick={() => navigate('/dashboard')}>
					{DICT.AUTH.SET_PASSWORD.DASHBOARD_BUTTON}
				</Button>
			</div>
		);
	}

	if (!token) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.AUTH.SET_PASSWORD.ERROR_TITLE}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.SET_PASSWORD.ERROR_MESSAGE}</p>
				<Button variant="default" onClick={() => navigate('/login')}>
					{DICT.AUTH.SET_PASSWORD.LOGIN_BUTTON}
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
					{DICT.AUTH.SET_PASSWORD.MESSAGE}
				</p>
				<Controller
					name="password"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="password"> {DICT.COMMON.LABELS.NEW_PASSWORD} </FieldLabel>
							<PasswordInput
								{...field}
								id="password"
								autoComplete="new-password"
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<Controller
					name="confirmPassword"
					control={form.control}
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="confirmPassword"> {DICT.FORMS.CONFIRM_PASSWORD} </FieldLabel>
							<PasswordInput
								{...field}
								id="confirmPassword"
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError errors={[fieldState.error]} />}
						</Field>
					)}
				/>
				<Button type="submit" disabled={form.formState.isSubmitting || isProcessing}>
					{isProcessing || form.formState.isSubmitting
						? DICT.AUTH.SET_PASSWORD.SUBMITTING_BUTTON
						: DICT.AUTH.SET_PASSWORD.SUBMIT_BUTTON}
				</Button>
			</FieldGroup>
		</form>
	);
}

SetPasswordForm.title = DICT.AUTH.SET_PASSWORD.TITLE;
