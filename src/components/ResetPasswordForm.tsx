import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
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
import { cn } from '@/lib/utils';

const resetSchema = z.object({
	email: z.string().email('Invalid email address'),
});

type ResetFormValues = z.infer<typeof resetSchema>;

export function ResetPasswordForm({ className, ...props }: React.ComponentProps<'form'>) {
	const form = useForm<ResetFormValues>({
		resolver: zodResolver(resetSchema),
		defaultValues: {
			email: '',
		},
	});

	const onSubmit = (data: ResetFormValues) => {
		console.log('Reset link requested for:', data.email);
	};

	return (
		<form
			className={cn('flex flex-col gap-6', className)}
			onSubmit={form.handleSubmit(onSubmit)}
			{...props}>
			<FieldGroup>
				<div className="flex flex-col items-center gap-2 text-center">
					<h1 className="text-2xl font-bold">Forgot password?</h1>
					<p className="text-sm text-muted-foreground text-balance">
						Enter your email address and we&apos;ll send you a link to reset your password.
					</p>
				</div>

				<Controller
					control={form.control}
					name="email"
					render={({ field, fieldState }) => (
						<Field>
							<FieldLabel htmlFor="email">Email address</FieldLabel>
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

				<Field>
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
					</Button>
				</Field>

				<FieldSeparator />

				<Field>
					<FieldDescription className="text-center">
						Remember your password?{' '}
						<Link to="/login" className="underline underline-offset-4">
							Login
						</Link>
					</FieldDescription>
				</Field>
			</FieldGroup>
		</form>
	);
}
