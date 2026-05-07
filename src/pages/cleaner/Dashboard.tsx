'use client';

import { BrushCleaning, Clock, Sparkles } from 'lucide-react';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/cleaningService';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function CleanerDashboardPage() {
	const { cleanings, isLoading } = useCleanings();

	const assignedCleanings = cleanings.filter(
		(c) => c.status === CLEANING_STATUS.CONFIRMED || c.status === CLEANING_STATUS.IN_PROGRESS,
	).length;
	const activeCleanings = cleanings.filter((c) => c.status === CLEANING_STATUS.IN_PROGRESS).length;
	const completedCleanings = cleanings.filter((c) => c.status === CLEANING_STATUS.COMPLETED).length;

	const stats = [
		{
			label: 'Assigned Cleanings',
			value: isLoading ? '-' : assignedCleanings,
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},
		{
			label: 'Active Cleanings',
			value: isLoading ? '-' : activeCleanings,
			icon: Clock,
			iconColor: 'text-warning',
		},
		{
			label: 'Completed Cleanings',
			value: isLoading ? '-' : completedCleanings,
			icon: Sparkles,
			iconColor: 'text-yellow-400',
		},
	];

	return <DashboardLayout stats={stats} />;
}
