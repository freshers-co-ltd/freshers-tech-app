'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import * as z from 'zod';
import { toast } from '@/components/Toast';
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
import { authService } from '@/features/auth/services/authService';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
	email: z.email(DICT.COMMON.VALIDATION.EMAIL_INVALID).trim(),
	password: z.string().min(1, DICT.COMMON.VALIDATION.PASSWORD_REQUIRED),
	rememberMe: z.boolean(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ className, ...props }: React.ComponentProps<'form'>) {
	const navigate = useNavigate();

	const form = useForm<LoginFormValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: {
			email:
				typeof window !== 'undefined' && localStorage.getItem('trust_device') === 'true'
					? (localStorage.getItem('saved_email') ?? '')
					: '',
			password: '',
			rememberMe:
				typeof window !== 'undefined' ? localStorage.getItem('trust_device') === 'true' : false,
		},
	});

	const onSubmit = async (values: LoginFormValues) => {
		localStorage.setItem('trust_device', String(values.rememberMe));

		const { error } = await authService.signIn(values);

		if (error) {
			toast.error(error);
			return;
		}

		if (values.rememberMe) {
			localStorage.setItem('saved_email', values.email);
		} else {
			localStorage.removeItem('saved_email');
		}

		toast.success(DICT.AUTH.LOGIN.TOAST_SUCCESS, { duration: 3000 });
		navigate('/dashboard');
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
							<FieldLabel htmlFor="email">{DICT.COMMON.LABELS.EMAIL}</FieldLabel>
							<Input
								{...field}
								id="email"
								type="email"
								autoComplete="username"
								placeholder={DICT.COMMON.PLACEHOLDERS.EMAIL}
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
							<FieldLabel htmlFor="password">{DICT.COMMON.LABELS.PASSWORD}</FieldLabel>
							<PasswordInput
								{...field}
								id="password"
								autoComplete="current-password"
								placeholder={DICT.COMMON.PLACEHOLDERS.PASSWORD}
								error={!!fieldState.error}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
							<div className="flex items-center">
								<Link to="/forgot-password" className="ml-auto text-sm link">
									{DICT.AUTH.LOGIN.LINK_FORGOT}
								</Link>
							</div>
						</Field>
					)}
				/>

				<Field>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting
							? DICT.AUTH.LOGIN.BUTTON_SUBMITTING
							: DICT.AUTH.LOGIN.BUTTON_SUBMIT}
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
										if (!checked) {
											localStorage.removeItem('saved_email');
										}
									}}
								/>
								<FieldLabel htmlFor="rememberMe" className="text-sm font-normal">
									{DICT.AUTH.LOGIN.CHECKBOX_TRUST}
								</FieldLabel>
							</Field>
						)}
					/>
				</div>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						{DICT.AUTH.LOGIN.LABEL_NO_ACCOUNT}{' '}
						<Link to="/signup" className="link">
							{DICT.AUTH.LOGIN.LINK_SIGNUP}
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
