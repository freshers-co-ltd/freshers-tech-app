'use client';

import { BrushCleaning, Clock, Home, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analyticsService, type PlatformStats } from '@/features/admin/analyticsService';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { formatHours } from '@/lib/utils';

export function AdminDashboardPage() {
	const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			const [platformStatsResult] = await Promise.all([analyticsService.getPlatformStats()]);

			if (!platformStatsResult.error) {
				setPlatformStats(platformStatsResult.data ?? null);
			}

			setLoading(false);
		};
		fetchData();
	}, []);

	const stats = [
		{
			label: 'Completed Cleanings This Month',
			value: loading ? '-' : platformStats?.completed_cleanings_mtd?.toString() || '0',
			icon: Sparkles,
			iconColor: 'text-yellow-400',
		},
		{
			label: 'Cleanings In Progress',
			value: loading ? '-' : platformStats?.cleanings_in_progress?.toString() || '0',
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},

		{
			label: 'Average Completion Time',
			value: loading
				? '-'
				: platformStats?.avg_completion_hours
					? formatHours(platformStats.avg_completion_hours)
					: '0 hours',
			icon: Clock,
			iconColor: 'text-orange-500',
		},
		{
			label: 'Total Properties',
			value: loading ? '-' : platformStats?.total_properties?.toString() || '0',
			icon: Home,
			iconColor: 'text-purple-600',
		},
	];

	return <DashboardLayout stats={stats} />;
}
