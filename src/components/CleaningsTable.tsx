'use client';

import { ArrowUpDown, Eye, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AssignCleanerDialog } from '@/components/AssignCleanerDialog';
import { DataTable } from '@/components/DataTable';
import { EntityBadge } from '@/components/EntityBadge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DICT } from '@/dictionary';
import { cleaningService as adminCleaningService } from '@/features/admin/cleaningService';
import type { CleaningStatus } from '@/features/cleanings/cleaningService';
import { supabase } from '@/lib/supabaseClient';
import { formatDate } from '@/lib/utils';

export interface CleaningData {
	id: string;
	status: CleaningStatus;
	scheduled_start: string;
	service_cost: number;
	cleaner_id: string | null | undefined;
	cleaner_name: string | null | undefined;
	host_id: string;
	host_name: string | null | undefined;
	property_id: string;
	property_address: string | null | undefined;
	property_postcode: string | null | undefined;
	property_town_city: string | null | undefined;
	created_at: string;
}

export interface CleaningsTableProps {
	data: CleaningData[];
	excludeHost?: boolean;
	excludeCleaner?: boolean;
	emptyMessage?: string;
	onRefresh?: () => void;
	onView?: (id: string) => void;
	page?: number;
	totalCount?: number;
	pageSize?: number;
	onPageChange?: (page: number) => void;
	loading?: boolean;
	sortField?: string;
	sortDirection?: 'asc' | 'desc';
	onSort?: (field: string) => void;
}

export function CleaningsTable({
	data,
	excludeHost,
	excludeCleaner,
	emptyMessage = 'No cleaning requests found',
	onRefresh,
	onView,
	page = 1,
	totalCount,
	pageSize = 20,
	onPageChange,
	loading = false,
	sortField,
	sortDirection = 'desc',
	onSort,
}: CleaningsTableProps) {
	const [availableCleaners, setAvailableCleaners] = useState<
		{ id: string; full_name: string | null }[]
	>([]);
	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [selectedCleaningId, setSelectedCleaningId] = useState<string>('');
	const [selectedCleanerId, setSelectedCleanerId] = useState<string>('');

	const fetchAvailableCleaners = useCallback(async () => {
		const { data: cleaners, error } = await supabase
			.from('profiles')
			.select('id, full_name')
			.eq('role', 'cleaner')
			.order('full_name');
		if (error) {
			console.error('Error fetching cleaners:', error);
		}
		if (cleaners) {
			setAvailableCleaners(cleaners);
		}
	}, []);

	useEffect(() => {
		fetchAvailableCleaners();
	}, [fetchAvailableCleaners]);

	const handleSort = useCallback(
		(field: string) => {
			onSort?.(field);
		},
		[onSort],
	);

	const isDisabled = useCallback(
		(cleaning: CleaningData) =>
			cleaning.status === 'in_progress' ||
			cleaning.status === 'completed' ||
			cleaning.status === 'cancelled',
		[],
	);

	const openAssignModal = useCallback((cleaningId: string, currentCleanerId?: string | null) => {
		setSelectedCleaningId(cleaningId);
		setSelectedCleanerId(currentCleanerId || '');
		setIsAssignModalOpen(true);
	}, []);

	const handleAssignCleaner = useCallback(async (): Promise<boolean> => {
		if (!selectedCleaningId || !selectedCleanerId) {
			toast.error('Please select a cleaner');
			return false;
		}
		const result = await adminCleaningService.assignCleaner(selectedCleaningId, selectedCleanerId);
		if (result.error) {
			toast.error(result.error);
			return false;
		}
		toast.success('Cleaner assigned');
		setIsAssignModalOpen(false);
		onRefresh?.();
		return true;
	}, [selectedCleaningId, selectedCleanerId, onRefresh]);

	const handleReassignCleaner = useCallback(
		(cleaningId: string, currentCleanerId?: string | null) => {
			openAssignModal(cleaningId, currentCleanerId);
		},
		[openAssignModal],
	);

	const columns = useMemo(() => {
		const cols: {
			key: string;
			label: string;
			sortable: boolean;
			render?: (item: CleaningData) => React.ReactNode;
		}[] = [
			{
				key: 'date',
				label: 'Date',
				sortable: true,
				render: (cleaning) => (
					<div>{formatDate(cleaning.scheduled_start, { variant: 'numeric' })}</div>
				),
			},
			{
				key: 'time',
				label: 'Time',
				sortable: true,
				render: (cleaning) => (
					<div>{formatDate(cleaning.scheduled_start, { variant: 'time' })}</div>
				),
			},
			{
				key: 'property_address',
				label: 'Address',
				sortable: true,
				render: (item) => item.property_address || 'Unknown Property',
			},
			{
				key: 'property_postcode',
				label: 'Postcode',
				sortable: true,
				render: (item) => item.property_postcode || '-',
			},
			{
				key: 'property_town_city',
				label: 'City',
				sortable: true,
				render: (item) => item.property_town_city || '-',
			},
		];

		if (!excludeHost) {
			cols.push({
				key: 'host_name',
				label: 'Host',
				sortable: true,
				render: (item) => item.host_name || '-',
			});
		}

		if (!excludeCleaner) {
			cols.push({
				key: 'cleaner_name',
				label: 'Cleaner',
				sortable: true,
				render: (item) =>
					item.cleaner_name || (
						<span className="text-muted-foreground">{DICT.ADMIN.DASHBOARD.UNASSIGNED}</span>
					),
			});
		}

		cols.push(
			{
				key: 'status',
				label: 'Status',
				sortable: true,
				render: (item) => <EntityBadge variant={{ type: 'cleaning', value: item.status }} />,
			},
			{
				key: 'service_cost',
				label: 'Cost',
				sortable: true,
				render: (item) => <span className="font-medium">£{item.service_cost}</span>,
			},
			{
				key: 'actions',
				label: 'Actions',
				sortable: false,
				render: (item) => (
					<div className="flex items-center justify-end gap-1">
						<Tooltip>
							<TooltipTrigger asChild>
								<Button variant="secondary" size="icon-sm" onClick={() => onView?.(item.id)}>
									<Eye className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>{DICT.COMMON.ACTIONS.VIEW_DETAILS}</p>
							</TooltipContent>
						</Tooltip>
						{!item.cleaner_name && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="icon-sm"
										onClick={() => openAssignModal(item.id)}>
										<UserPlus className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{DICT.COMMON.ACTIONS.ASSIGN_CLEANER}</p>
								</TooltipContent>
							</Tooltip>
						)}
						{item.cleaner_name && !isDisabled(item) && (
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="icon-sm"
										onClick={() => handleReassignCleaner(item.id, item.cleaner_id)}>
										<ArrowUpDown className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>{DICT.COMMON.ACTIONS.REASSIGN}</p>
								</TooltipContent>
							</Tooltip>
						)}
					</div>
				),
			},
		);

		return cols;
	}, [excludeHost, excludeCleaner, openAssignModal, handleReassignCleaner, onView, isDisabled]);

	const renderMobileHeader = useCallback(
		(cleaning: CleaningData) => (
			<div className="flex items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="font-medium truncate">{cleaning.property_address || 'Unknown Property'}</p>
					<p className="text-sm text-muted-foreground">
						{cleaning.property_postcode}
						{cleaning.property_town_city ? ` · ${cleaning.property_town_city}` : ''}
					</p>
					<p className="text-sm text-muted-foreground mt-1">
						{formatDate(cleaning.scheduled_start)} at{' '}
						{formatDate(cleaning.scheduled_start, { variant: 'time' })}
					</p>
				</div>

				<div className="flex gap-1 shrink-0">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => onView?.(cleaning.id)}>
								<Eye className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent>
							<p>View Details</p>
						</TooltipContent>
					</Tooltip>
					{!cleaning.cleaner_name && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => openAssignModal(cleaning.id)}>
									<UserPlus className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Assign</p>
							</TooltipContent>
						</Tooltip>
					)}
					{cleaning.cleaner_name && !isDisabled(cleaning) && (
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									variant="secondary"
									size="sm"
									className="h-8 w-8 p-0"
									onClick={() => openAssignModal(cleaning.id)}>
									<ArrowUpDown className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent>
								<p>Reassign</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>
			</div>
		),
		[onView, openAssignModal, isDisabled],
	);

	const priorityColumns = [
		'property_address',
		'property_postcode',
		'property_town_city',
		'actions',
	];

	const excludeFromExpanded = [
		'date',
		'time',
		'property_address',
		'property_postcode',
		'property_town_city',
		'actions',
	];

	return (
		<>
			<DataTable
				data={data}
				columns={columns}
				keyField="id"
				emptyMessage={emptyMessage}
				sortField={sortField}
				sortDirection={sortDirection}
				onSort={handleSort}
				loading={loading}
				page={page}
				totalCount={totalCount}
				pageSize={pageSize}
				onPageChange={onPageChange}
				renderMobileHeader={renderMobileHeader}
				priorityColumns={priorityColumns}
				excludeFromExpanded={excludeFromExpanded}
			/>
			<AssignCleanerDialog
				open={isAssignModalOpen}
				onOpenChange={setIsAssignModalOpen}
				availableCleaners={availableCleaners}
				selectedCleanerId={selectedCleanerId}
				onSelectCleaner={setSelectedCleanerId}
				onAssign={handleAssignCleaner}
			/>
		</>
	);
}
