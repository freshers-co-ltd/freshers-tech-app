'use client';

import { Banknote, ListTodo } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { DICT } from '@/dictionary';
import { CleanerPayConfigDialog } from '@/features/admin/components/CleanerPayConfigDialog';
import { CleaningsFilter } from '@/features/admin/components/CleaningsFilter';
import { CleaningsTable } from '@/features/admin/components/CleaningsTable';
import { StandardTasksDialog } from '@/features/admin/components/StandardTasksDialog';
import { useAdminCleanings } from '@/features/admin/hooks/useAdminCleanings';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';

export function AdminCleaningsPage() {
	const {
		cleanings,
		loading,
		totalCount,
		statusFilter,
		searchQuery,
		cleanerFilter,
		upcomingFilter,
		page,
		sortField,
		sortDirection,
		availableCleaners,
		setStatusFilter,
		setSearchQuery,
		setCleanerFilter,
		setUpcomingFilter,
		setPage,
		setSortField,
		setSortDirection,
		refresh,
		allData,
		hasMore,
		loadMore,
		loadingMore,
		onPageChange,
	} = useAdminCleanings();

	const { fetchCleanings } = useCleanings();

	const [isStandardTasksOpen, setIsStandardTasksOpen] = useState(false);
	const [isPayConfigOpen, setIsPayConfigOpen] = useState(false);

	const dict = DICT.ADMIN.CLEANINGS;
	const buttonsDict = dict.BUTTONS;

	const fetchById = useCallback(async (id: string) => {
		const result = await cleaningsService.getCleaningRequestById(id);
		return result.data || null;
	}, []);

	const handleUpsert = useCallback(
		async (data: CleaningFormValues, existingId?: string) => {
			if (!existingId) {
				return;
			}

			const result = await adminCleaningService.updateCleaning(existingId, {
				information: data.information || '',
				scheduled_start: data.scheduled_start.toISOString(),
				stocks_included: data.stocks_included,
				custom_tasks: data.custom_tasks?.map((t) => t.description) || [],
				cleaner_pay: data.cleaner_pay,
				service_cost: data.service_cost,
			});

			if (result.error) {
				throw new Error(result.error);
			}

			await fetchCleanings();
		},
		[fetchCleanings],
	);

	const handleDelete = useCallback(async (id: string) => {
		const result = await adminCleaningService.softDeleteCleaning(id);
		if (result.error) {
			toast.error(result.error);
			throw new Error(result.error);
		}
		toast.success(DICT.CLEANINGS.DELETE.TOAST_SUCCESS);
	}, []);

	const refreshAll = useCallback(async () => {
		await refresh();
		await fetchCleanings();
	}, [refresh, fetchCleanings]);

	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="mb-6 flex flex-col gap-6 md:flex-row md:justify-between">
				<div className="space-y-1">
					<h1 className="text-[1.75rem] font-bold uppercase text-center md:text-left">
						{dict.TITLE}
					</h1>
				</div>
				<div className="space-y-3 md:space-x-3 flex flex-col md:flex-row">
					<Button variant="outline" onClick={() => setIsStandardTasksOpen(true)}>
						<ListTodo className="size-4 mr-1" />
						{buttonsDict.STANDARD_TASKS}
					</Button>
					<Button variant="outline" onClick={() => setIsPayConfigOpen(true)}>
						<Banknote className="size-4 mr-1" />
						{buttonsDict.PAY_RATES}
					</Button>
				</div>
			</header>
			<CleaningsFilter
				searchQuery={searchQuery}
				onSearchChange={(value) => {
					setSearchQuery(value);
					setPage(1);
				}}
				searchDebounceMs={0}
				statusFilter={statusFilter}
				onStatusChange={(value) => {
					setStatusFilter(value);
					setPage(1);
				}}
				cleanerFilter={cleanerFilter}
				onCleanerChange={(value) => {
					setCleanerFilter(value);
					setPage(1);
				}}
				upcomingFilter={upcomingFilter}
				onUpcomingChange={(value) => {
					setUpcomingFilter(value);
					setPage(1);
				}}
				onClear={() => {
					setSearchQuery('');
					setStatusFilter('all');
					setCleanerFilter('all');
					setUpcomingFilter(false);
					setPage(1);
				}}
				availableCleaners={availableCleaners}
			/>

			<CleaningsTable
				data={cleanings}
				fetchById={fetchById}
				onUpsert={handleUpsert}
				onDelete={handleDelete}
				userRole="admin"
				loading={loading}
				page={page}
				totalCount={totalCount}
				onPageChange={onPageChange}
				sortField={sortField}
				sortDirection={sortDirection}
				onSort={(field) => {
					if (sortField === field) {
						setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
					} else {
						setSortField(field);
						setSortDirection('desc');
					}
					setPage(1);
				}}
				onRefresh={refreshAll}
				allData={allData}
				hasMore={hasMore}
				onLoadMore={loadMore}
				loadingMore={loadingMore}
				availableCleaners={availableCleaners}
			/>

			<StandardTasksDialog open={isStandardTasksOpen} onOpenChange={setIsStandardTasksOpen} />
			<CleanerPayConfigDialog open={isPayConfigOpen} onOpenChange={setIsPayConfigOpen} />
		</main>
	);
}
