import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

const signupSchema = z
	.object({
		name: z.string().min(2, 'Full name must be at least 2 characters'),
		email: z.string().email('Invalid email address'),
		password: z.string().min(8, 'Password must be at least 8 characters long'),
		confirmPassword: z.string(),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Passwords don't match",
		path: ['confirmPassword'],
	});

type SignupFormValues = z.infer<typeof signupSchema>;

export function SignupForm({ className, ...props }: React.ComponentProps<'form'>) {
	const form = useForm<SignupFormValues>({
		resolver: zodResolver(signupSchema),
		defaultValues: {
			name: '',
			email: '',
			password: '',
			confirmPassword: '',
		},
	});

	const onSubmit = (data: SignupFormValues) => {
		console.log('Signup Data:', data);
		// TODO: Implement registration logic
	};

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup>
				<Controller
					control={form.control}
					name="name"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="name">Full Name</FieldLabel>
							<Input
								{...field}
								id="name"
								type="text"
								placeholder="John Smith"
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="email">Email</FieldLabel>
							<Input
								{...field}
								id="email"
								type="email"
								placeholder="account@example.com"
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
							<FieldLabel htmlFor="password">Password</FieldLabel>
							<Input
								{...field}
								id="password"
								type="password"
								placeholder="••••••••"
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{!fieldState.error && (
								<FieldDescription>Must be at least 8 characters long</FieldDescription>
							)}
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<Controller
					control={form.control}
					name="confirmPassword"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="confirm-password">Confirm Password</FieldLabel>
							<Input
								{...field}
								id="confirm-password"
								type="password"
								placeholder="••••••••"
								className={fieldState.error ? 'border-destructive' : ''}
							/>
							{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}
						</Field>
					)}
				/>

				<div className="flex flex-col gap-4 mt-2">
					<Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting ? 'Creating Account...' : 'Create Account'}
					</Button>
					<FieldDescription className="text-center">
						Already have an account?{' '}
						<Link
							to="/"
							className="underline transition-colors underline-offset-4 decoration-muted-foreground hover:text-primary">
							Sign in
						</Link>
					</FieldDescription>
				</div>
			</FieldGroup>
		</form>
	);
}
