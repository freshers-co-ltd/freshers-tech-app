import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
	showToggle?: boolean;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
	({ className, showToggle = true, ...props }, ref) => {
		const [showPassword, setShowPassword] = React.useState(false);

		const toggleVisibility = () => setShowPassword(!showPassword);

		return (
			<div className="relative">
				<Input
					type={showPassword ? 'text' : 'password'}
					className={cn('pr-10', className)}
					ref={ref}
					{...props}
				/>
				{showToggle && (
					<button
						type="button"
						onClick={toggleVisibility}
						className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						aria-label={showPassword ? 'Hide password' : 'Show password'}>
						{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
					</button>
				)}
			</div>
		);
	},
);

PasswordInput.displayName = 'PasswordInput';

export { PasswordInput };
