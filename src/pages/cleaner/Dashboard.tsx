'use client';

import { Banknote, BrushCleaning, Clock, Sparkles } from 'lucide-react';
import { DICT } from '@/dictionary';
import { useCleanerDashboardStats } from '@/hooks/useCleanerDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function CleanerDashboardPage() {
	const { stats, isLoading } = useCleanerDashboardStats();
	const dict = DICT.DASHBOARD.CLEANER;

	const statsConfig = [
		{
			label: dict.STATS.ASSIGNED,
			value: isLoading ? '-' : stats.assigned,
			icon: Clock,
			iconColor: 'text-purple-600',
		},
		{
			label: dict.STATS.ACTIVE,
			value: isLoading ? '-' : stats.active,
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},
		{
			label: dict.STATS.COMPLETED,
			value: isLoading ? '-' : stats.completed,
			icon: Sparkles,
			iconColor: 'text-yellow-400',
		},
		{
			label: dict.STATS.TOTAL_EARNINGS,
			value: isLoading ? '-' : `£${stats.totalEarnings.toFixed(2)}`,
			icon: Banknote,
			iconColor: 'text-green-600',
		},
	];

	return <DashboardLayout stats={statsConfig} />;
}
