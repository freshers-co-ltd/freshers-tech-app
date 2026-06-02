import { useEffect, useMemo, useState } from 'react';
import { analyticsService } from '@/features/admin/services/analyticsService';
import { useAuth } from '@/features/auth/AuthContext';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/types';
import { useProperties } from '@/features/properties/PropertyContext';

export interface DashboardStats {
	// Admin
	completedCleaningsMtd?: number;
	cleaningsInProgress?: number;
	avgCompletionHours?: number;
	totalProperties?: number;
	// Host
	upcoming?: number;
	requested?: number;
	inProgress?: number;
	// Cleaner
	assigned?: number;
	active?: number;
	completed?: number;
	totalEarnings?: number;
}

export function useDashboardStats(): { stats: DashboardStats | null; isLoading: boolean } {
	const { profile } = useAuth();
	const role = profile?.role;
	const { cleanings, isLoading: cleaningsLoading } = useCleanings();
	const { properties, isLoading: propertiesLoading } = useProperties();

	const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
	const [adminLoading, setAdminLoading] = useState(true);

	useEffect(() => {
		if (role !== 'admin') {
			setAdminStats(null);
			setAdminLoading(false);
			return;
		}

		const fetchData = async () => {
			setAdminLoading(true);
			const result = await analyticsService.getPlatformStats();

			if (!result.error && result.data) {
				setAdminStats({
					completedCleaningsMtd: result.data.completed_cleanings_mtd ?? 0,
					cleaningsInProgress: result.data.cleanings_in_progress ?? 0,
					avgCompletionHours: result.data.avg_completion_hours ?? 0,
					totalProperties: result.data.total_properties ?? 0,
				});
			}

			setAdminLoading(false);
		};

		fetchData();
	}, [role]);

	const hostStats = useMemo((): DashboardStats | null => {
		if (role !== 'host') {
			return null;
		}

		return {
			upcoming: cleanings.filter(
				(c) => c.status === CLEANING_STATUS.CONFIRMED && new Date(c.scheduled_start) > new Date(),
			).length,
			inProgress: cleanings.filter((c) => c.status === CLEANING_STATUS.IN_PROGRESS).length,
			requested: cleanings.filter((c) => c.status === CLEANING_STATUS.REQUESTED).length,
			totalProperties: properties.length,
		};
	}, [cleanings, properties, role]);

	const cleanerStats = useMemo((): DashboardStats | null => {
		if (role !== 'cleaner') {
			return null;
		}

		return {
			assigned: cleanings.filter(
				(c) => c.status === CLEANING_STATUS.CONFIRMED || c.status === CLEANING_STATUS.IN_PROGRESS,
			).length,
			active: cleanings.filter((c) => c.status === CLEANING_STATUS.IN_PROGRESS).length,
			completed: cleanings.filter((c) => c.status === CLEANING_STATUS.COMPLETED).length,
			totalEarnings: cleanings
				.filter((c) => c.status === CLEANING_STATUS.COMPLETED)
				.reduce((sum, c) => sum + (c.cleaner_pay || 0), 0),
		};
	}, [cleanings, role]);

	const stats = adminStats ?? hostStats ?? cleanerStats ?? null;
	const isLoading = adminLoading || cleaningsLoading || propertiesLoading;

	return { stats, isLoading };
}
