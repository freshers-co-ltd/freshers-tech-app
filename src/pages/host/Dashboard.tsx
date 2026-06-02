'use client';

import { BrushCleaning, Calendar, ClipboardList, Home, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DICT } from '@/dictionary';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function HostDashboardPage() {
	const { stats, isLoading } = useDashboardStats();
	const dict = DICT.DASHBOARD.HOST;
	const navigate = useNavigate();

	if (isLoading) {
		return <DashboardLayout stats={[]} />;
	}

	const statsConfig = [
		{
			label: dict.STATS.CONFIRMED,
			value: stats?.upcoming ?? 0,
			icon: Calendar,
			iconColor: 'text-success',
		},
		{
			label: dict.STATS.IN_PROGRESS,
			value: stats?.inProgress ?? 0,
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
		{
			label: dict.STATS.REQUESTED,
			value: stats?.requested ?? 0,
			icon: ClipboardList,
			iconColor: 'text-warning',
		},
		{
			label: dict.STATS.PROPERTIES,
			value: stats?.totalProperties ?? 0,
			icon: Home,
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
	];

	return (
		<DashboardLayout
			stats={statsConfig}
			cta={{
				title: dict.CTA_CARD.TITLE,
				message: dict.CTA_CARD.MESSAGE,
				buttonText: dict.CTA_CARD.BUTTON,
				icon: Zap,
				onClick: () => navigate('/host/cleanings?cleaning_create=true'),
			}}
		/>
	);
}
