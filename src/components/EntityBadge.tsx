import { Badge } from '@/components/ui/badge';
import type { UserRole } from '@/features/auth/types';
import type { CleaningStatus } from '@/features/cleanings/types';

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
	draft: 'bg-gray-background text-gray border-gray-border',
	requested: 'bg-blue-background text-blue border-blue-border',
	confirmed: 'bg-purple-background text-purple border-purple-border',
	in_progress: 'bg-yellow-background text-yellow border-yellow-border',
	completed: 'bg-green-background text-green border-green-border',
	cancelled: 'bg-red-background text-red border-red-border',
};

const ROLE_STYLES: Record<UserRole, string> = {
	admin: 'bg-yellow-background text-yellow border-yellow-border',
	host: 'bg-purple-background text-purple border-purple-border',
	cleaner: 'bg-blue-background text-blue border-blue-border',
};

const USER_STATUS_STYLES: Record<string, string> = {
	online: 'bg-green-background text-green border-green-border',
	offline: 'bg-gray-background text-gray border-gray-border',
	banned: 'bg-red-background text-red border-red-border',
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
