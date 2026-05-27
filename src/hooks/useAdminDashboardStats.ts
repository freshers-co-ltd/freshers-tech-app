import { useEffect, useState } from 'react';
import { analyticsService } from '@/features/admin/services/analyticsService';

interface AdminDashboardStats {
	completedCleaningsMtd: number;
	cleaningsInProgress: number;
	avgCompletionHours: number;
	totalProperties: number;
}

export function useAdminDashboardStats() {
	const [stats, setStats] = useState<AdminDashboardStats | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setIsLoading(true);
			const result = await analyticsService.getPlatformStats();

			if (!result.error && result.data) {
				setStats({
					completedCleaningsMtd: result.data.completed_cleanings_mtd ?? 0,
					cleaningsInProgress: result.data.cleanings_in_progress ?? 0,
					avgCompletionHours: result.data.avg_completion_hours ?? 0,
					totalProperties: result.data.total_properties ?? 0,
				});
			}

			setIsLoading(false);
		};

		fetchData();
	}, []);

	return { stats, isLoading };
}
