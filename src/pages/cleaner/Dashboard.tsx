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
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
		{
			label: dict.STATS.ACTIVE,
			value: isLoading ? '-' : stats.active,
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
		{
			label: dict.STATS.COMPLETED,
			value: isLoading ? '-' : stats.completed,
			icon: Sparkles,
			iconColor: 'text-warning-light',
		},
		{
			label: dict.STATS.TOTAL_EARNINGS,
			value: isLoading ? '-' : `£${stats.totalEarnings.toFixed(2)}`,
			icon: Banknote,
			iconColor: 'text-success',
		},
	];

	return <DashboardLayout stats={statsConfig} />;
}
