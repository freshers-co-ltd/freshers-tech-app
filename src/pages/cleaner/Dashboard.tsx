'use client';

import { Banknote, BrushCleaning, Clock, Sparkles } from 'lucide-react';
import { DICT } from '@/dictionary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function CleanerDashboardPage() {
	const { stats, isLoading } = useDashboardStats();
	const dict = DICT.DASHBOARD.CLEANER;

	if (isLoading) {
		return <DashboardLayout stats={[]} />;
	}

	const statsConfig = [
		{
			label: dict.STATS.ASSIGNED,
			value: stats?.assigned ?? 0,
			icon: Clock,
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
		{
			label: dict.STATS.ACTIVE,
			value: stats?.active ?? 0,
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
		{
			label: dict.STATS.COMPLETED,
			value: stats?.completed ?? 0,
			icon: Sparkles,
			iconColor: 'text-warning-light',
		},
		{
			label: dict.STATS.TOTAL_EARNINGS,
			value: stats?.totalEarnings !== undefined ? `£${stats.totalEarnings.toFixed(2)}` : '£0.00',
			icon: Banknote,
			iconColor: 'text-success',
		},
	];

	return <DashboardLayout stats={statsConfig} />;
}
