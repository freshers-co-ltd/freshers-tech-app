import { useMemo } from 'react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/cleaningService';
import { useProperties } from '@/features/properties/PropertyContext';

interface HostDashboardStats {
	upcoming: number;
	inProgress: number;
	requested: number;
	totalProperties: number;
}

export function useHostDashboardStats() {
	const { properties, isLoading: propertiesLoading } = useProperties();
	const { cleanings, isLoading: cleaningsLoading } = useCleanings();

	const stats = useMemo((): HostDashboardStats => {
		const upcoming = cleanings.filter(
			(c) => c.status === CLEANING_STATUS.CONFIRMED && new Date(c.scheduled_start) > new Date(),
		).length;

		const requested = cleanings.filter((c) => c.status === CLEANING_STATUS.REQUESTED).length;

		const inProgress = cleanings.filter((c) => c.status === CLEANING_STATUS.IN_PROGRESS).length;

		return {
			upcoming,
			inProgress,
			requested,
			totalProperties: properties.length,
		};
	}, [cleanings, properties]);

	const isLoading = propertiesLoading || cleaningsLoading;

	return { stats, isLoading };
}
