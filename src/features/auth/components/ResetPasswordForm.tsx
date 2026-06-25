'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { Loading } from '@/components/Loading';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { useAuth } from '@/features/auth/AuthContext';
import { authService } from '@/features/auth/services/authService';
import { cn } from '@/lib/utils';

const resetPasswordSchema = z
	.object({
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

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();
	const { loading, user } = useAuth();
	const [isSuccess, setIsSuccess] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [isExchanging, setIsExchanging] = useState(false);
	const [exchangeError, setExchangeError] = useState(false);
	const exchangeAttemptedRef = useRef(false);

	const form = useForm<ResetPasswordFormValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
	});

	useEffect(() => {
		const hash = window.location.hash || '';
		const search = window.location.search || '';
		const isRecovery =
			search.includes('type=recovery') ||
			hash.includes('type=recovery') ||
			(search.includes('code=') && window.location.pathname === '/update-password');

		if (!isRecovery || exchangeAttemptedRef.current) {
			return;
		}

		exchangeAttemptedRef.current = true;

		const searchParams = new URLSearchParams(search);
		const hashParams = new URLSearchParams(hash.substring(1));
		const code = searchParams.get('code') || hashParams.get('code');

		if (!code) {
			setExchangeError(true);
			return;
		}

		setIsExchanging(true);

		authService.exchangeCodeForSession(code).then(({ error }) => {
			window.history.replaceState(null, '', '/update-password');
			if (error) {
				setIsExchanging(false);
				setExchangeError(true);
				toast.error(DICT.ERRORS.AUTH.LINK_EXPIRED);
			}
		});
	}, []);

	useEffect(() => {
		if (user && isExchanging) {
			setIsExchanging(false);
		}
	}, [user, isExchanging]);

	const onSubmit = async (data: ResetPasswordFormValues) => {
		setIsProcessing(true);

		const { error } = await authService.updatePassword(data.password);

		if (error) {
			setIsProcessing(false);
			toast.error(error);
			return;
		}

		setIsSuccess(true);
		toast.success(DICT.AUTH.RESET_PASSWORD.TOAST_SUCCESS, { duration: 3000 });
	};

	if (loading || isExchanging) {
		return <Loading />;
	}

	if (!user || exchangeError) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.AUTH.SET_PASSWORD.TITLE_ERROR}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.SET_PASSWORD.MESSAGE_ERROR}</p>
				<Button variant="default" onClick={() => navigate('/login')}>
					{DICT.AUTH.SET_PASSWORD.BUTTON_LOGIN}
				</Button>
			</div>
		);
	}

	if (isSuccess) {
		return (
			<div className="text-center space-y-4">
				<h1 className="text-xl font-bold">{DICT.AUTH.RESET_PASSWORD.TITLE_SUCCESS}</h1>
				<p className="text-muted-foreground mb-8">{DICT.AUTH.RESET_PASSWORD.MESSAGE_SUCCESS}</p>
				<Button variant="default" onClick={() => navigate('/login')}>
					{DICT.AUTH.RESET_PASSWORD.BUTTON_LOGIN}
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
							<FieldLabel htmlFor="confirmPassword">
								{DICT.COMMON.LABELS.CONFIRM_PASSWORD}
							</FieldLabel>
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
				<Button type="submit" disabled={isProcessing}>
					{isProcessing
						? DICT.AUTH.RESET_PASSWORD.BUTTON_SUBMITTING
						: DICT.AUTH.RESET_PASSWORD.BUTTON_SUBMIT}
				</Button>
			</FieldGroup>
		</form>
	);
}

ResetPasswordForm.title = DICT.AUTH.RESET_PASSWORD.TITLE;
