'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
	email: z.email(DICT.FORMS.VALIDATION.EMAIL_INVALID).trim(),
	password: z.string().min(1, DICT.FORMS.VALIDATION.PASSWORD_REQUIRED),
	rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email: '',
			password: '',
			rememberMe:
				typeof window !== 'undefined' ? localStorage.getItem('trust_device') === 'true' : false,
		},
	});

	const onSubmit = async (values: LoginFormValues) => {
		try {
			localStorage.setItem('trust_device', String(values.rememberMe));

			const { error } = await authService.signIn(values);

			if (error) {
				toast.error(error);
				return;
			}

			toast.success(DICT.AUTH.LOGIN.SUCCESS_TOAST, { duration: 3000 });
			navigate('/dashboard');
		} catch (err) {
			console.error('Login error:', err);
			toast.error(DICT.ERRORS.COMMON.GENERIC);
		} finally {
			form.reset(undefined, { keepValues: true });
		}
	};

	return (
		<form
			className={cn('flex flex-col', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup className="gap-6">
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">{DICT.AUTH.LOGIN.TITLE}</h1>
				</div>

				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="email">{DICT.FORMS.LABELS.EMAIL}</FieldLabel>
							<Input
								{...field}
								id="email"
								type="email"
								autoComplete="username"
								placeholder={DICT.FORMS.PLACEHOLDERS.EMAIL}
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
							<FieldLabel htmlFor="password">{DICT.FORMS.LABELS.PASSWORD}</FieldLabel>
							<PasswordInput
								{...field}
								id="password"
								autoComplete="current-password"
								placeholder={DICT.FORMS.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							<div className="flex items-center">
								<Link
									to="/forgot-password"
									className="ml-auto text-sm underline-offset-4 hover:underline">
									{DICT.AUTH.LOGIN.FORGOT_LINK}
								</Link>
							</div>
						</Field>
					)}
				/>

				<Field>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.LOGIN.SUBMITTING_BUTTON
							: DICT.AUTH.LOGIN.SUBMIT_BUTTON}
					</Button>
				</Field>

				<div className="-mt-3">
					<Controller
						control={form.control}
						name="rememberMe"
						render={({ field }) => (
							<Field orientation="horizontal" className="gap-2">
								<Checkbox
									id="rememberMe"
									checked={field.value}
									onCheckedChange={(checked) => {
										field.onChange(checked);
										localStorage.setItem('trust_device', String(checked));
									}}
								/>
								<FieldLabel htmlFor="rememberMe" className="text-sm font-normal">
									Trust this device
								</FieldLabel>
							</Field>
						)}
					/>
				</div>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						{DICT.AUTH.LOGIN.NO_ACCOUNT_LABEL}{' '}
						<Link to="/signup" className="underline underline-offset-4">
							{DICT.AUTH.LOGIN.SIGNUP_LINK}
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
