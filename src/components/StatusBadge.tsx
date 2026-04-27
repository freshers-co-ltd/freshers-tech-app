import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type BadgeVariant = 'status' | 'role' | 'custom';

interface StatusBadgeProps {
	variant?: BadgeVariant;
	value: string;
	className?: string;
}

const STATUS_COLORS: Record<string, string> = {
	draft: 'bg-gray-100 text-gray-800 border-gray-200',
	requested: 'bg-blue-100 text-blue-800 border-blue-200',
	confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
	in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	completed: 'bg-green-100 text-green-800 border-green-200',
	cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
	banned: 'bg-red-100 text-red-800 border-red-200',
	online: 'bg-green-100 text-green-800 border-green-200',
	offline: 'bg-gray-100 text-gray-800 border-gray-200',
};

const ROLE_COLORS: Record<string, string> = {
	admin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	host: 'bg-purple-100 text-purple-800 border-purple-200',
	cleaner: 'bg-blue-100 text-blue-800 border-blue-200',
};

export function StatusBadge({ variant = 'status', value, className }: StatusBadgeProps) {
	const colors =
		variant === 'role'
			? ROLE_COLORS[value] || 'bg-gray-100 text-gray-800 border-gray-200'
			: STATUS_COLORS[value] || 'bg-gray-100 text-gray-800 border-gray-200';

	const displayValue = value.replace('_', ' ');

	return (
		<Badge variant="outline" className={cn(colors, 'capitalize', className)}>
			{displayValue}
		</Badge>
	);
}
