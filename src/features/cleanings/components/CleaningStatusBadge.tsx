import { Badge } from '@/components/ui/badge';
import { CLEANING_STATUS, type CleaningStatus } from '@/features/cleanings/cleaningService';
import { cn } from '@/lib/utils';

interface CleaningStatusBadgeProps {
	status: CleaningStatus;
	className?: string;
	isCleanerView?: boolean;
}

const statusColors: Record<CleaningStatus, string> = {
	draft: 'bg-gray-100 text-gray-800 border-gray-200',
	requested: 'bg-blue-100 text-blue-800 border-blue-200',
	confirmed: 'bg-purple-100 text-purple-800 border-purple-200',
	in_progress: 'bg-yellow-100 text-yellow-800 border-yellow-200',
	completed: 'bg-green-100 text-green-800 border-green-200',
	cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function CleaningStatusBadge({
	status,
	className,
	isCleanerView,
}: CleaningStatusBadgeProps) {
	const displayLabel = isCleanerView && status === CLEANING_STATUS.CONFIRMED ? 'assigned' : status;
	const formattedStatus = displayLabel.replace('_', ' ');

	return (
		<Badge variant="outline" className={cn(statusColors[status], className)}>
			{formattedStatus.toUpperCase()}
		</Badge>
	);
}
