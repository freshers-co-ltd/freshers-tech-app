'use client';

import { BrushCleaning, ClipboardList, Clock, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CleaningsTable } from '@/components/CleaningsTable';
import { type AdminCleanerDetail, userService } from '@/features/admin/userService';
import { useResourceModals } from '@/hooks/useResourceModals';
import { UserDetailLayout } from '@/layouts/UserDetailLayout';
import { formatHours } from '@/lib/utils';

export function AdminCleanerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [cleaner, setCleaner] = useState<AdminCleanerDetail | null>(null);
	const [loading, setLoading] = useState(true);

	const modal = useResourceModals({ resourceName: 'cleaning' });

	const fetchCleanerDetail = useCallback(async () => {
		if (!id) {
			return;
		}
		setLoading(true);
		const result = await userService.getCleanerDetail(id);
		if (result.error) {
			toast.error(result.error);
			navigate('/admin/users');
		} else {
			setCleaner(result.data as AdminCleanerDetail | null);
		}
		setLoading(false);
	}, [id, navigate]);

	useEffect(() => {
		fetchCleanerDetail();
	}, [fetchCleanerDetail]);

	const handleResetPassword = async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		const result = await userService.resetPassword(cleaner.id);
		return result;
	};

	const handleBan = async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		const result = await userService.banUser(cleaner.id);
		if (!result.error) {
			fetchCleanerDetail();
		}
		return result;
	};

	const handleUnban = async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		const result = await userService.unbanUser(cleaner.id);
		if (!result.error) {
			fetchCleanerDetail();
		}
		return result;
	};

	if (!cleaner) {
		return null;
	}

	const cleanings = cleaner.assigned_cleanings || [];
	const stats = cleaner.cleaner_stats;

	const tableData = cleanings.map((c) => ({
		id: c.id,
		status: c.status,
		scheduled_start: c.scheduled_start,
		service_cost: c.service_cost,
		cleaner_id: cleaner.id,
		cleaner_name: cleaner.full_name,
		host_id: c.host_id,
		host_name: c.host_name || undefined,
		property_id: c.property_id,
		property_address: c.property_address,
		property_postcode: c.property_postcode,
		property_town_city: c.property_town_city,
		created_at: c.created_at,
	}));

	const statsConfig = [
		{
			id: 'total-assigned',
			label: 'Total Assigned Cleanings',
			value: stats?.total_assigned || 0,
			icon: ClipboardList,
			iconColor: 'text-purple-600',
		},
		{
			id: 'current-assigned',
			label: 'Current Assigned Cleanings',
			value: stats?.confirmed || 0,
			icon: BrushCleaning,
			iconColor: 'text-blue-600',
		},
		{
			id: 'completed',
			label: 'Completed Cleanings',
			value: stats?.completed || 0,
			icon: Sparkles,
			iconColor: 'text-yellow-400',
		},
		{
			id: 'avg-completion',
			label: 'Average Completion Time',
			value: stats?.avg_completion_hours ? formatHours(stats.avg_completion_hours) : '0 hours',
			icon: Clock,
			iconColor: 'text-orange-500',
		},
	];

	return (
		<UserDetailLayout
			user={cleaner}
			userRole="cleaner"
			isLoading={loading}
			onResetPassword={handleResetPassword}
			onBan={handleBan}
			onUnban={handleUnban}
			stats={statsConfig}
			sections={[
				{
					title: 'Assigned Cleanings',
					content: (
						<CleaningsTable
							data={tableData}
							excludeCleaner={true}
							emptyMessage="No cleanings assigned"
							onRefresh={fetchCleanerDetail}
							onView={(id) => modal.openView(id)}
							pageSize={10}
							totalCount={cleanings.length}
						/>
					),
				},
			]}
		/>
	);
}
