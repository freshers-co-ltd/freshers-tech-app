'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { PasswordInput } from '@/components/ui/password-input';
import { DICT } from '@/dictionary';
import { authService } from '@/features/auth/authService';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
	email: z.email(DICT.VALIDATION.EMAIL_INVALID).trim(),
	password: z.string().min(1, DICT.VALIDATION.PASSWORD_REQUIRED),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();
	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
	});

	const onSubmit = async (values: LoginFormValues) => {
		try {
			const { error } = await authService.signIn(values);

			if (error) {
				toast.error(error);
				return;
			}

			toast.success(DICT.AUTH.LOGIN.SUCCESS_TOAST, { duration: 3000 });
			navigate('/dashboard');
		} catch (err) {
			console.error('Login error:', err);
			toast.error(DICT.COMMON.ERROR_GENERIC);
		} finally {
			form.reset(undefined, { keepValues: true });
		}
	};

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup>
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{DICT.AUTH.LOGIN.TITLE}</h1>
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
								aria-invalid={!!fieldState.error}
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="password"
					render={({ field, fieldState }) => (
						<Field>
							<div className="flex items-center">
								<FieldLabel htmlFor="password">{DICT.AUTH.LABELS.PASSWORD}</FieldLabel>
								<Link
									to="/forgot-password"
									className="ml-auto text-sm underline-offset-4 hover:underline">
									{DICT.AUTH.LABELS.FORGOT_LINK}
								</Link>
							</div>
							<PasswordInput
								{...field}
								id="password"
								placeholder={DICT.AUTH.PLACEHOLDERS.PASSWORD}
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
							? DICT.AUTH.LOGIN.SUBMITTING_LABEL
							: DICT.AUTH.LOGIN.SUBMIT_LABEL}
					</Button>
				</Field>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						{DICT.AUTH.LOGIN.NO_ACCOUNT}{' '}
						<Link to="/signup" className="underline underline-offset-4">
							{DICT.AUTH.LOGIN.SIGNUP_LINK}
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
