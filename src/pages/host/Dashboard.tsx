'use client';

import { BrushCleaning, Calendar, ClipboardList, Home, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DICT } from '@/dictionary';
import { useHostDashboardStats } from '@/hooks/useHostDashboardStats';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function HostDashboardPage() {
	const { stats, isLoading } = useHostDashboardStats();
	const dict = DICT.DASHBOARD.HOST;
	const navigate = useNavigate();

	const statsConfig = [
		{
			label: dict.STATS.CONFIRMED,
			value: isLoading ? '-' : stats.upcoming,
			icon: Calendar,
			iconColor: 'text-green-600',
		},

		{
			label: dict.STATS.IN_PROGRESS,
			value: isLoading ? '-' : stats.inProgress,
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},
		{
			label: dict.STATS.REQUESTED,
			value: isLoading ? '-' : stats.requested,
			icon: ClipboardList,
			iconColor: 'text-yellow-400',
		},
		{
			label: dict.STATS.PROPERTIES,
			value: isLoading ? '-' : stats.totalProperties,
			icon: Home,
			iconColor: 'text-purple-600',
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
