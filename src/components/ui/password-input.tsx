import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	showToggle?: boolean;
	error?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, showToggle = true, error, ...props }, ref) => {
		const [showPassword, setShowPassword] = React.useState(false);

		const toggleVisibility = () => setShowPassword(!showPassword);

		return (
			<div className="relative">
				<Input
					type={showPassword ? 'text' : 'password'}
					className={cn(
						'pr-10',
						error && 'border-destructive focus-visible:ring-destructive',
						className,
					)}
					aria-invalid={error ? 'true' : 'false'}
					ref={ref}
					{...props}
				/>
				{showToggle && (
					<button
						type="button"
						onClick={toggleVisibility}
						className="absolute -translate-y-1/2 rounded-md cursor-pointer right-3 top-1/2 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={showPassword ? 'Hide password' : 'Show password'}>
						{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
					</button>
				)}
			</div>
		);
	},
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
