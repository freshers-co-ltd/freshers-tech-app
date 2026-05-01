import { Calendar, ClipboardList, Home, ShieldCheck, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DICT } from '@/dictionary';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { CLEANING_STATUS } from '@/features/cleanings/cleaningService';
import { useProperties } from '@/features/properties/PropertyContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';

export function HostDashboardPage() {
	const { properties, isLoading: propertiesLoading } = useProperties();
	const { cleanings, isLoading: cleaningsLoading } = useCleanings();
	const navigate = useNavigate();

	const dict = DICT.DASHBOARD.HOST;

	const upcomingCleanings = cleanings.filter(
		(c) => c.status === CLEANING_STATUS.CONFIRMED && new Date(c.scheduled_start) > new Date(),
	).length;
	const requestedCleanings = cleanings.filter((c) => c.status === CLEANING_STATUS.REQUESTED).length;
	const inProgressCleanings = cleanings.filter(
		(c) => c.status === CLEANING_STATUS.IN_PROGRESS,
	).length;
	const totalProperties = properties.length;

	const stats = [
		{
			label: dict.STATS.CONFIRMED,
			value: cleaningsLoading ? '-' : upcomingCleanings,
			icon: Calendar,
			iconColor: 'text-destructive',
		},

		{
			label: dict.STATS.IN_PROGRESS,
			value: cleaningsLoading ? '-' : inProgressCleanings,
			icon: ShieldCheck,
			iconColor: 'text-success',
		},
		{
			label: dict.STATS.REQUESTED,
			value: cleaningsLoading ? '-' : requestedCleanings,
			icon: ClipboardList,
			iconColor: 'text-warning',
		},
		{
			label: dict.STATS.PROPERTIES,
			value: propertiesLoading ? '-' : totalProperties,
			icon: Home,
			iconColor: 'text-primary',
		},
	];

	return (
		<DashboardLayout
			stats={stats}
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
