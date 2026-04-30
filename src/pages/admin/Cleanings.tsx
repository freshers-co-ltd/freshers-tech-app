'use client';

import { Eye, Loader2, Recycle, Search, UserPlus, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { type ColumnDef, DataTable } from '@/components/DataTable';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DICT } from '@/dictionary';
import { useAdminCleanings } from '@/features/admin/useAdminCleanings';
import type { CleaningRequest } from '@/features/cleanings/cleaningService';
import { cleaningService } from '@/features/cleanings/cleaningService';
import { CleanerCleaningDetailView } from '@/features/cleanings/components/CleanerCleaningDetailView';
import { useResourceModals } from '@/hooks/useResourceModals';
import { AdminLayout } from '@/layouts/AdminLayout';

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
		isAssignModalOpen,
		selectedCleaner,
		setStatusFilter,
		setSearchQuery,
		setCleanerFilter,
		setPage,
		setSortField,
		setSortDirection,
		setIsAssignModalOpen,
		setSelectedCleaner,
		handleAssignCleaner,
		handleUnassignCleaner,
		openAssignModal,
	} = useAdminCleanings();

	const modal = useResourceModals({ resourceName: 'cleaning' });

	const [viewingCleaning, setViewingCleaning] = useState<CleaningRequest | null>(null);
	const [viewingLoading, setViewingLoading] = useState(false);

	const fetchViewingCleaning = useCallback(async () => {
		if (!modal.viewId) {
			return;
		}
		setViewingLoading(true);
		const result = await cleaningService.getCleaningRequestById(modal.viewId);
		if (!result.error && result.data) {
			setViewingCleaning(result.data);
		}
		setViewingLoading(false);
	}, [modal.viewId]);

	useEffect(() => {
		if (modal.isViewOpen && modal.viewId) {
			fetchViewingCleaning();
		} else {
			setViewingCleaning(null);
		}
	}, [modal.isViewOpen, modal.viewId, fetchViewingCleaning]);

	const d = DICT.ADMIN.CLEANINGS;

	const statusOptions = [
		{ label: 'All Statuses', value: 'all' },
		{ label: 'Draft', value: 'draft' },
		{ label: 'Requested', value: 'requested' },
		{ label: 'Confirmed', value: 'confirmed' },
		{ label: 'In Progress', value: 'in_progress' },
		{ label: 'Completed', value: 'completed' },
		{ label: 'Cancelled', value: 'cancelled' },
	];

	const isDisabled = (cleaning: { status: string }) =>
		cleaning.status === 'in_progress' || cleaning.status === 'completed';

	const cleaningColumns: ColumnDef<(typeof cleanings)[0]>[] = [
		{
			key: 'date',
			label: 'Date',
			sortable: true,
			render: (cleaning) => (
				<div>
					<div className="font-medium">
						{new Date(cleaning.scheduled_start).toLocaleDateString()}
					</div>
					<div className="text-sm text-muted-foreground">
						{new Date(cleaning.scheduled_start).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit',
						})}
					</div>
				</div>
			),
		},
		{
			key: 'property',
			label: 'Property',
			sortable: true,
			render: (cleaning) => (
				<div>
					<div className="font-medium">{cleaning.property_address}</div>
					<div className="text-sm text-muted-foreground">{cleaning.property_postcode}</div>
				</div>
			),
		},
		{
			key: 'host',
			label: 'Host',
			sortable: true,
			render: (cleaning) => cleaning.host_name,
		},
		{
			key: 'cleaner',
			label: 'Cleaner',
			sortable: true,
			render: (cleaning) =>
				cleaning.cleaner_name || <span className="text-muted-foreground">Unassigned</span>,
		},
		{
			key: 'status',
			label: 'Status',
			sortable: true,
			render: (cleaning) => <StatusBadge value={cleaning.status} />,
		},
		{
			key: 'cost',
			label: 'Cost',
			sortable: true,
			render: (cleaning) => (
				<span className="font-medium">
					{DICT.FORMAT.CURRENCY}
					{cleaning.service_cost}
				</span>
			),
		},
		{
			key: 'actions',
			label: 'Actions',
			sortable: false,
			className: 'text-right',
			render: (cleaning) => (
				<div className="flex items-center justify-end gap-1">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="secondary"
								size="sm"
								className="h-8 w-8 p-0"
								onClick={() => modal.openView(cleaning.id)}>
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
								<p>Assign Cleaner</p>
							</TooltipContent>
						</Tooltip>
					)}
					{cleaning.cleaner_name && !isDisabled(cleaning) && (
						<>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="sm"
										className="h-8 w-8 p-0"
										onClick={() => openAssignModal(cleaning.id)}>
										<Recycle className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Reassign Cleaner</p>
								</TooltipContent>
							</Tooltip>
							<Tooltip>
								<TooltipTrigger asChild>
									<Button
										variant="secondary"
										size="sm"
										className="h-8 w-8 p-0"
										onClick={() => handleUnassignCleaner(cleaning.id)}>
										<UserX className="size-4" />
									</Button>
								</TooltipTrigger>
								<TooltipContent>
									<p>Unassign</p>
								</TooltipContent>
							</Tooltip>
						</>
					)}
				</div>
			),
		},
	];

	const renderMobileCard = (cleaning: (typeof cleanings)[0]) => (
		<>
			<div className="mb-3">
				<div className="font-medium">{cleaning.property_address}</div>
				<div className="text-sm text-muted-foreground">{cleaning.property_postcode}</div>
			</div>
			<div className="flex flex-col gap-2 text-sm">
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Date</span>
					<span>{new Date(cleaning.scheduled_start).toLocaleDateString()}</span>
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Host</span>
					<span>{cleaning.host_name}</span>
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Cleaner</span>
					<span className="text-muted-foreground">{cleaning.cleaner_name || 'Unassigned'}</span>
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] border-b py-2">
					<span className="font-medium">Status</span>
					<StatusBadge value={cleaning.status} />
				</div>
				<div className="grid grid-cols-[1fr_1.5fr] py-2">
					<span className="font-medium">Cost</span>
					<span className="font-medium">
						{DICT.FORMAT.CURRENCY}
						{cleaning.service_cost}
					</span>
				</div>
			</div>
			<div className="flex gap-2 mt-3">
				<Button size="sm" variant="outline" onClick={() => modal.openView(cleaning.id)}>
					<Eye className="size-3 mr-1" />
					View Details
				</Button>
				{!cleaning.cleaner_name ? (
					<Button size="sm" onClick={() => openAssignModal(cleaning.id)}>
						<UserPlus className="size-3 mr-1" />
						Assign
					</Button>
				) : !isDisabled(cleaning) ? (
					<>
						<Button size="sm" variant="outline" onClick={() => openAssignModal(cleaning.id)}>
							<Recycle className="size-3 mr-1" />
							Reassign
						</Button>
						<Button
							size="sm"
							variant="destructive"
							onClick={() => handleUnassignCleaner(cleaning.id)}>
							<UserX className="size-3 mr-1" />
							Unassign
						</Button>
					</>
				) : null}
			</div>
		</>
	);

	return (
		<AdminLayout title={d.TITLE} stats={[]}>
			<main className="max-width-container">
				<Card className="mb-6 py-1">
					<div className="p-3 flex flex-wrap gap-4">
						<div className="flex-1 relative min-w-[200px]">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
							<Input
								className="h-8 pl-9"
								placeholder="Search..."
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
								<SelectValue placeholder="Status" />
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
							<SelectTrigger className="w-[150px]">
								<SelectValue placeholder="Cleaner" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Cleaners</SelectItem>
								<SelectItem value="unassigned">Unassigned</SelectItem>
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
							Clear
						</Button>
					</div>
				</Card>

				<Card className="p-0 overflow-hidden">
					{loading ? (
						<div className="flex items-center justify-center p-12">
							<Loader2 className="size-8 animate-spin text-muted-foreground" />
						</div>
					) : cleanings.length === 0 ? (
						<div className="p-12 text-center text-muted-foreground">No cleaning requests found</div>
					) : (
						<DataTable
							data={cleanings}
							columns={cleaningColumns}
							loading={loading}
							emptyMessage="No cleaning requests found"
							page={page}
							totalCount={totalCount}
							pageSize={20}
							onPageChange={setPage}
							keyField="id"
							renderMobileCard={renderMobileCard}
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
						/>
					)}
				</Card>

				<Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>Assign Cleaner</DialogTitle>
							<DialogDescription>Select which cleaner to assign</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<Select value={selectedCleaner} onValueChange={setSelectedCleaner}>
								<SelectTrigger>
									<SelectValue placeholder="Select a cleaner" />
								</SelectTrigger>
								<SelectContent>
									{availableCleaners.map((cleaner) => (
										<SelectItem key={cleaner.id} value={cleaner.id}>
											{cleaner.full_name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							<div className="flex justify-end gap-2">
								<Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>
									Cancel
								</Button>
								<Button onClick={handleAssignCleaner}>Assign</Button>
							</div>
						</div>
					</DialogContent>
				</Dialog>

				<Dialog open={modal.isViewOpen} onOpenChange={() => modal.handleClose()}>
					<DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
						<DialogHeader>
							<DialogTitle>Cleaning Details</DialogTitle>
							<DialogDescription>View complete cleaning information</DialogDescription>
						</DialogHeader>
						{viewingLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="size-6 animate-spin text-muted-foreground" />
							</div>
						) : viewingCleaning ? (
							<CleanerCleaningDetailView
								cleaning={viewingCleaning}
								open={modal.isViewOpen}
								onOpenChange={(open) => !open && modal.handleClose()}
							/>
						) : null}
					</DialogContent>
				</Dialog>
			</main>
		</AdminLayout>
	);
}
