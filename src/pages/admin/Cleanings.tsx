'use client';

import { Banknote, ListTodo, Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from '@/components/Toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { DICT } from '@/dictionary';
import { CleanerPayConfigDialog } from '@/features/admin/components/CleanerPayConfigDialog';
import { CleaningsTable } from '@/features/admin/components/CleaningsTable';
import { StandardTasksDialog } from '@/features/admin/components/StandardTasksDialog';
import { useAdminCleanings } from '@/features/admin/hooks/useAdminCleanings';
import { cleaningService as adminCleaningService } from '@/features/admin/services/cleaningService';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import type { CleaningFormValues } from '@/features/cleanings/components/CleaningForm';
import { cleaningsService } from '@/features/cleanings/services/cleaningsService';
import { CLEANING_STATUS } from '@/features/cleanings/types';

export function AdminCleaningsPage() {
	const {
		cleanings,
		loading,
		totalCount,
		statusFilter,
		searchQuery,
		cleanerFilter,
		page,
		sortField,
		sortDirection,
		availableCleaners,
		setStatusFilter,
		setSearchQuery,
		setCleanerFilter,
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
	const filtersDict = dict.FILTERS;
	const statusDict = dict.STATUS_OPTIONS;
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
		toast.success(DICT.CLEANINGS.DELETE.ADMIN_TOAST_SUCCESS);
	}, []);

	const refreshAll = useCallback(async () => {
		await refresh();
		await fetchCleanings();
	}, [refresh, fetchCleanings]);

	const statusOptions = [
		{ label: statusDict.ALL, value: 'all' },
		{ label: statusDict.REQUESTED, value: CLEANING_STATUS.REQUESTED },
		{ label: statusDict.CONFIRMED, value: CLEANING_STATUS.CONFIRMED },
		{ label: statusDict.IN_PROGRESS, value: CLEANING_STATUS.IN_PROGRESS },
		{ label: statusDict.COMPLETED, value: CLEANING_STATUS.COMPLETED },
		{ label: statusDict.CANCELLED, value: CLEANING_STATUS.CANCELLED },
	];

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
			<Card className="mb-4 py-1">
				<div className="p-3 flex flex-wrap gap-4">
					<div className="flex-1 relative min-w-[200px]">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
						<Input
							className="h-8 pl-9"
							placeholder={filtersDict.SEARCH_PLACEHOLDER}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									setPage(1);
								}
							}}
						/>
					</div>
					<Select
						value={statusFilter}
						onValueChange={(v) => {
							setStatusFilter(v);
							setPage(1);
						}}>
						<SelectTrigger className="w-[150px]">
							<SelectValue placeholder={filtersDict.STATUS} />
						</SelectTrigger>
						<SelectContent>
							{statusOptions.map((opt) => (
								<SelectItem key={opt.value} value={opt.value}>
									{opt.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select
						value={cleanerFilter}
						onValueChange={(v) => {
							setCleanerFilter(v);
							setPage(1);
						}}>
						<SelectTrigger className="w-[150px]" aria-label={filtersDict.CLEANER}>
							<SelectValue placeholder={filtersDict.CLEANER} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{filtersDict.ALL_CLEANERS}</SelectItem>
							<SelectItem value="unassigned">{filtersDict.UNASSIGNED}</SelectItem>
							{availableCleaners.map((cleaner) => (
								<SelectItem key={cleaner.id} value={cleaner.id}>
									{cleaner.full_name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Button
						className="h-8"
						variant="outline"
						onClick={() => {
							setSearchQuery('');
							setStatusFilter('all');
							setCleanerFilter('all');
							setPage(1);
						}}>
						{filtersDict.CLEAR}
					</Button>
				</div>
			</Card>

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
