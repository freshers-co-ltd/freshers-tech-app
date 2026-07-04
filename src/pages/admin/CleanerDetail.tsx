'use client';

import { BrushCleaning, ClipboardList, Clock, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DICT } from '@/dictionary';
import { CleaningsTable } from '@/features/admin/components/CleaningsTable';
import { useAdminUsers } from '@/features/admin/hooks/useAdminUsers';
import { useCleanerDetail } from '@/features/admin/hooks/useCleanerDetail';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { userService } from '@/features/admin/services/userService';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import { UserDetailLayout } from '@/layouts/UserDetailLayout';
import { formatHours } from '@/lib/utils';

export function AdminCleanerDetailPage() {
	const { id } = useParams<{ id: string }>();
	const navigate = useNavigate();
	const [cleaningsSortField, setCleaningsSortField] = useState<string>('scheduled_start');
	const [cleaningsSortDirection, setCleaningsSortDirection] = useState<'asc' | 'desc'>('desc');

	const { cleaner, loading, refresh } = useCleanerDetail(id, {
		cleaningsSortField,
		cleaningsSortDirection,
	});
	const { fetchCleanings } = useCleanings();
	const { handleResetPassword, handleBan, handleUnban } = useAdminUsers();
	const [availableCleaners, setAvailableCleaners] = useState<
		{ id: string; full_name: string | null }[]
	>([]);

	useEffect(() => {
		userService.getAvailableCleaners().then((result) => {
			if (!result.error && result.data) {
				setAvailableCleaners(result.data);
			}
		});
	}, []);

	const fetchCleaningById = useCallback(async (cleaningId: string) => {
		const result = await cleaningsService.getCleaningRequestById(cleaningId);
		return result.data || null;
	}, []);

	const handleUpsert = useCallback(
		async (values: CleaningFormValues, existingId?: string) => {
			if (!existingId) {
				return;
			}
			const result = await adminCleaningService.updateCleaning(existingId, {
				information: values.information || '',
				scheduled_start: values.scheduled_start.toISOString(),
				stocks_included: values.stocks_included,
				custom_tasks: values.custom_tasks?.map((t) => t.description) || [],
				cleaner_pay: values.cleaner_pay,
				service_cost: values.service_cost,
			});
			if (result.error) {
				throw new Error(result.error);
			}
			await Promise.all([refresh(), fetchCleanings()]);
		},
		[refresh, fetchCleanings],
	);

	const refreshAll = useCallback(async () => {
		await Promise.all([refresh(), fetchCleanings()]);
	}, [refresh, fetchCleanings]);

	const onResetPassword = useCallback(async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		return handleResetPassword(cleaner.id, refresh);
	}, [cleaner, handleResetPassword, refresh]);

	const onBan = useCallback(async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		return handleBan(cleaner.id, refresh);
	}, [cleaner, handleBan, refresh]);

	const onUnban = useCallback(async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		return handleUnban(cleaner.id, refresh);
	}, [cleaner, handleUnban, refresh]);

	const onDeleteUser = useCallback(async () => {
		if (!cleaner) {
			return { error: 'No user loaded' };
		}
		const result = await userService.purgeUserPii(cleaner.id);
		if (result.error) {
			return { error: result.error };
		}
		navigate('/admin/users');
		return { error: null };
	}, [cleaner, navigate]);

	if (!cleaner) {
		return null;
	}

	const cleanings = cleaner.assigned_cleanings || [];
	const stats = cleaner.cleaner_stats;
	const dict = DICT.ADMIN.CLEANINGS.DETAIL.CLEANER_DETAIL;

	const tableData = cleanings.map((c) => ({
		id: c.id,
		status: c.status,
		scheduled_start: c.scheduled_start,
		service_cost: c.service_cost,
		cleaner_pay: c.cleaner_pay,
		cleaner_id: cleaner.id,
		cleaner_name: cleaner.full_name,
		host_id: c.host_id,
		host_name: c.host_name,
		property_id: c.property_id,
		property_address: c.property_address,
		property_postcode: c.property_postcode,
		property_town_city: c.property_town_city,
		created_at: c.created_at,
		information: null,
		stocks_included: false,
		clock_in_time: c.clock_in_time,
		clock_out_time: c.clock_out_time,
		updated_at: c.created_at,
		deleted_at: null,
	}));

	const statsConfig = [
		{
			id: 'total-assigned',
			label: dict.STATS.TOTAL_ASSIGNED,
			value: stats?.total_assigned || 0,
			icon: ClipboardList,
			iconColor: 'text-[color-mix(in_oklch,var(--color-primary),var(--color-destructive))]',
		},
		{
			id: 'current-assigned',
			label: dict.STATS.CURRENT_ASSIGNED,
			value: stats?.confirmed || 0,
			icon: BrushCleaning,
			iconColor: 'text-primary-light',
		},
		{
			id: 'completed',
			label: dict.STATS.COMPLETED,
			value: stats?.completed || 0,
			icon: Sparkles,
			iconColor: 'text-warning-light',
		},
		{
			id: 'avg-completion',
			label: dict.STATS.AVG_COMPLETION,
			value: stats?.avg_completion_hours ? formatHours(stats.avg_completion_hours) : '0 hours',
			icon: Clock,
			iconColor: 'text-[color-mix(in_oklch,var(--color-warning),var(--color-destructive))]',
		},
	];

	return (
		<UserDetailLayout
			user={cleaner}
			userRole="cleaner"
			isLoading={loading}
			onResetPassword={onResetPassword}
			onBan={onBan}
			onUnban={onUnban}
			onDeleteUser={onDeleteUser}
			stats={statsConfig}
			sections={[
				{
					title: dict.TITLE,
					content: (
						<CleaningsTable
							data={tableData}
							fetchById={fetchCleaningById}
							onUpsert={handleUpsert}
							userRole="admin"
							excludeCleaner={true}
							hideHostCost={true}
							emptyMessage={dict.EMPTY}
							onRefresh={refreshAll}
							pageSize={10}
							totalCount={cleanings.length}
							availableCleaners={availableCleaners}
							sortField={cleaningsSortField}
							sortDirection={cleaningsSortDirection}
							onSort={(field) => {
								if (cleaningsSortField === field) {
									setCleaningsSortDirection(cleaningsSortDirection === 'asc' ? 'desc' : 'asc');
								} else {
									setCleaningsSortField(field);
									setCleaningsSortDirection('desc');
								}
							}}
						/>
					),
				},
			]}
		/>
	);
}
