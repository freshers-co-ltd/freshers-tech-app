import { useMemo } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/types';

interface CleanerDashboardStats {
	assigned: number;
	active: number;
	completed: number;
	totalEarnings: number;
}

export function useCleanerDashboardStats() {
	const { cleanings, isLoading } = useCleanings();

	const stats = useMemo((): CleanerDashboardStats => {
		const assigned = cleanings.filter(
			(c) => c.status === CLEANING_STATUS.CONFIRMED || c.status === CLEANING_STATUS.IN_PROGRESS,
		).length;

		const active = cleanings.filter((c) => c.status === CLEANING_STATUS.IN_PROGRESS).length;

		const completed = cleanings.filter((c) => c.status === CLEANING_STATUS.COMPLETED).length;

		const totalEarnings = cleanings
			.filter((c) => c.status === CLEANING_STATUS.COMPLETED)
			.reduce((sum, c) => sum + (c.cleaner_pay || 0), 0);

		return {
			assigned,
			active,
			completed,
			totalEarnings,
		};
	}, [cleanings]);

	return { stats, isLoading };
}
