'use client';

import { BrushCleaning, Clock, Home, Sparkles } from 'lucide-react';
import { DICT } from '@/dictionary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { formatHours } from '@/lib/utils';

export function AdminDashboardPage() {
	const { stats, isLoading } = useDashboardStats();
	const dict = DICT.DASHBOARD.ADMIN;

	if (isLoading) {
		return <DashboardLayout stats={[]} />;
	}

	const statsConfig = [
		{
			label: dict.STATS.COMPLETED_THIS_MONTH,
			value: stats?.completedCleaningsMtd?.toString() || '0',
			icon: Sparkles,
			iconColor: 'text-warning-light',
		},
		{
			label: dict.STATS.IN_PROGRESS,
			value: stats?.cleaningsInProgress?.toString() || '0',
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
		{
			label: dict.STATS.AVG_COMPLETION_TIME,
			value: stats?.avgCompletionHours ? formatHours(stats.avgCompletionHours) : '0 hours',
			icon: Clock,
			iconColor: 'text-[color-mix(in_oklch,var(--color-warning),var(--color-destructive))]',
		},
		{
			label: dict.STATS.TOTAL_PROPERTIES,
			value: stats?.totalProperties?.toString() || '0',
			icon: Home,
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
	];

	return <DashboardLayout stats={statsConfig} />;
}
