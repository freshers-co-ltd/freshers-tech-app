import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/features/auth/authService';
import type { CleaningStatus } from '@/features/cleanings/cleaningService';

export type EntityBadgeVariant =
	| { type: 'cleaning'; value: CleaningStatus }
	| { type: 'role'; value: UserRole }
	| { type: 'userStatus'; value: 'online' | 'offline' | 'banned' };

interface EntityBadgeProps {
	variant: EntityBadgeVariant;
	className?: string;
	customLabel?: string;
}

const CLEANING_STYLES: Record<CleaningStatus, string> = {
	draft: 'bg-gray-100 text-gray-800 border-gray-200',
	requested: 'bg-blue-100 text-blue-800 border-blue-200',
	confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
	in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	completed: 'bg-green-100 text-green-800 border-green-200',
	cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

const ROLE_STYLES: Record<UserRole, string> = {
	admin: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	host: 'bg-purple-100 text-purple-800 border-purple-200',
	cleaner: 'bg-blue-100 text-blue-800 border-blue-200',
};

const USER_STATUS_STYLES: Record<string, string> = {
	online: 'bg-green-100 text-green-800 border-green-200',
	offline: 'bg-gray-100 text-gray-800 border-gray-200',
	banned: 'bg-red-100 text-red-800 border-red-200',
};

export function EntityBadge({ variant, className, customLabel }: EntityBadgeProps) {
	const style =
		variant.type === 'cleaning'
			? CLEANING_STYLES[variant.value]
			: variant.type === 'role'
				? ROLE_STYLES[variant.value]
				: USER_STATUS_STYLES[variant.value];

	const label =
		customLabel || (variant.type === 'cleaning' ? variant.value.replace('_', ' ') : variant.value);

	return (
		<Badge variant="outline" className={`uppercase ${style} ${className || ''}`}>
			{label}
		</Badge>
	);
}
