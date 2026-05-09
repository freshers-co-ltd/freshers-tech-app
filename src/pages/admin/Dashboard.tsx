'use client';

import { BrushCleaning, Clock, Home, Sparkles } from 'lucide-react';
import { DICT } from '@/dictionary';
import { useAdminDashboardStats } from '@/hooks/useAdminDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { formatHours } from '@/lib/utils';

export function AdminDashboardPage() {
	const { stats, isLoading } = useAdminDashboardStats();
	const dict = DICT.DASHBOARD.ADMIN;

	const statsConfig = [
		{
			label: dict.STATS.COMPLETED_THIS_MONTH,
			value: isLoading ? '-' : stats?.completedCleaningsMtd?.toString() || '0',
			icon: Sparkles,
			iconColor: 'text-yellow-400',
		},
		{
			label: dict.STATS.IN_PROGRESS,
			value: isLoading ? '-' : stats?.cleaningsInProgress?.toString() || '0',
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},
		{
			label: dict.STATS.AVG_COMPLETION_TIME,
			value: isLoading
				? '-'
				: stats?.avgCompletionHours
					? formatHours(stats.avgCompletionHours)
					: '0 hours',
			icon: Clock,
			iconColor: 'text-orange-500',
		},
		{
			label: dict.STATS.TOTAL_PROPERTIES,
			value: isLoading ? '-' : stats?.totalProperties?.toString() || '0',
			icon: Home,
			iconColor: 'text-purple-600',
		},
	];

	return <DashboardLayout stats={statsConfig} />;
}
