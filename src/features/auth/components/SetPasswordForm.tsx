'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
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
	const [isSuccess, setIsSuccess] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [authError, setAuthError] = useState(false);

	const form = useForm<SetPasswordFormValues>({
		resolver: zodResolver(setPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
	});

	useEffect(() => {
		const handleAuth = async () => {
			const hash = window.location.hash.substring(1);
			const params = new URLSearchParams(hash);
			const accessToken = params.get('access_token');
			const refreshToken = params.get('refresh_token');

			if (accessToken && refreshToken) {
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});

				if (error) {
					setAuthError(true);
					toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
				} else {
					setIsAuthenticated(true);
				}
			} else {
				setAuthError(true);
			}
		};

		handleAuth();
	}, []);

	const onSubmit = async (data: SetPasswordFormValues) => {
		setIsProcessing(true);

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

	if (authError) {
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

	if (!isAuthenticated && !authError) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.COMMON.LOADING.TITLE}</h1>
				<p className="text-muted-foreground">{DICT.COMMON.LOADING.MESSAGE}</p>
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
