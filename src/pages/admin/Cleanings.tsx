'use client';

import { ListTodo, Search } from 'lucide-react';
import { useState } from 'react';
import { CleaningsTable } from '@/components/CleaningsTable';
import { CleaningViewDialog } from '@/components/CleaningViewDialog';
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
import { StandardTasksDialog } from '@/features/admin/components/StandardTasksDialog';
import { useAdminCleanings } from '@/features/admin/useAdminCleanings';
import { useResourceModals } from '@/hooks/useResourceModals';

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
	} = useAdminCleanings();

	const modal = useResourceModals({ resourceName: 'cleaning' });
	const [isStandardTasksOpen, setIsStandardTasksOpen] = useState(false);

	const dict = DICT.ADMIN.CLEANINGS;

	const statusOptions = [
		{ label: 'All Statuses', value: 'all' },
		{ label: 'Draft', value: 'draft' },
		{ label: 'Requested', value: 'requested' },
		{ label: 'Confirmed', value: 'confirmed' },
		{ label: 'In Progress', value: 'in_progress' },
		{ label: 'Completed', value: 'completed' },
		{ label: 'Cancelled', value: 'cancelled' },
	];

	return (
		<main className="max-width-container p-2 md:p-8">
			<header className="mb-6 flex flex-col gap-6 md:flex-row md:justify-between">
				<div className="space-y-1">
					<h1 className="text-[1.75rem] font-bold uppercase text-center md:text-left">
						{dict.TITLE}
					</h1>
				</div>
				<Button variant="outline" onClick={() => setIsStandardTasksOpen(true)}>
					<ListTodo className="size-4 mr-1" />
					Standard Tasks
				</Button>
			</header>
			<Card className="mb-4 py-1">
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

			<CleaningsTable
				data={cleanings}
				loading={loading}
				page={page}
				totalCount={totalCount}
				onPageChange={setPage}
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
				onView={(id) => modal.openView(id)}
			/>

			<CleaningViewDialog
				open={modal.isViewOpen}
				viewId={modal.viewId}
				onClose={modal.handleClose}
			/>

			<StandardTasksDialog open={isStandardTasksOpen} onOpenChange={setIsStandardTasksOpen} />
		</main>
	);
}
