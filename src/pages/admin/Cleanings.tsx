'use client';

import { Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';
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
import { DICT } from '@/dictionary';
import {
	type AdminCleaning,
	type CleaningFilters,
	type CleaningStatus,
	cleaningService,
} from '@/features/admin/cleaningService';
import { type AvailableCleaner, userService } from '@/features/admin/userService';

export function AdminCleaningsPage() {
	const [cleanings, setCleanings] = useState<AdminCleaning[]>([]);
	const [loading, setLoading] = useState(true);
	const [totalCount, setTotalCount] = useState(0);

	const [statusFilter, setStatusFilter] = useState<string>('all');
	const [searchQuery, setSearchQuery] = useState('');
	const [cleanerFilter, setCleanerFilter] = useState<string>('all');
	const [page, setPage] = useState(1);
	const limit = 20;

	const [availableCleaners, setAvailableCleaners] = useState<AvailableCleaner[]>([]);

	const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
	const [selectedCleaning, setSelectedCleaning] = useState<string>('');
	const [selectedCleaner, setSelectedCleaner] = useState<string>('');
	const [assigning, setAssigning] = useState(false);

	const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
	const [selectedStatusCleaning, setSelectedStatusCleaning] = useState<string>('');
	const [newStatus, setNewStatus] = useState<string>('requested');
	const [updatingStatus, setUpdatingStatus] = useState(false);

	const fetchCleanings = useCallback(async () => {
		setLoading(true);

		const filters: CleaningFilters = {};
		if (statusFilter !== 'all') {
			filters.status = statusFilter as CleaningStatus;
		}
		if (cleanerFilter !== 'all') {
			filters.cleanerId = cleanerFilter;
		}
		filters.search = searchQuery || undefined;

		const [cleaningsResult, countResult] = await Promise.all([
			cleaningService.getAllCleanings(filters, page, limit),
			cleaningService.getCleaningsCount(filters),
		]);

		if (cleaningsResult.error) {
			toast.error(cleaningsResult.error);
		} else {
			setCleanings(cleaningsResult.data || []);
		}

		if (!countResult.error) {
			setTotalCount(countResult.data || 0);
		}
		setLoading(false);
	}, [statusFilter, cleanerFilter, page, searchQuery]);

	const fetchAvailableCleaners = useCallback(async () => {
		const result = await userService.getAvailableCleaners();
		if (!result.error) {
			setAvailableCleaners(result.data || []);
		}
	}, []);

	useEffect(() => {
		fetchCleanings();
	}, [fetchCleanings]);

	useEffect(() => {
		fetchAvailableCleaners();
	}, [fetchAvailableCleaners]);

	const handleAssignCleaner = async () => {
		if (!selectedCleaning || !selectedCleaner) {
			toast.error('Please select a cleaner');
			return;
		}
		setAssigning(true);
		const result = await cleaningService.assignCleaner(selectedCleaning, selectedCleaner);
		setAssigning(false);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Cleaner assigned');
			setIsAssignModalOpen(false);
			fetchCleanings();
		}
	};

	const handleUnassignCleaner = async (cleaningId: string) => {
		const result = await cleaningService.unassignCleaner(cleaningId);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Cleaner unassigned');
			fetchCleanings();
		}
	};

	const handleUpdateStatus = async () => {
		setUpdatingStatus(true);
		const result = await cleaningService.updateStatus(
			selectedStatusCleaning,
			newStatus as CleaningStatus,
		);
		setUpdatingStatus(false);
		if (result.error) {
			toast.error(result.error);
		} else {
			toast.success('Status updated');
			setIsStatusModalOpen(false);
			fetchCleanings();
		}
	};

	const filteredCleanings = cleanings;

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

	const getStatusBadge = (status: string) => {
		const colors: Record<string, string> = {
			draft: 'bg-gray-100 text-gray-700',
			requested: 'bg-blue-100 text-blue-700',
			confirmed: 'bg-yellow-100 text-yellow-700',
			in_progress: 'bg-purple-100 text-purple-700',
			completed: 'bg-green-100 text-green-700',
			cancelled: 'bg-red-100 text-red-700',
		};
		return colors[status] || 'bg-gray-100 text-gray-700';
	};

	return (
		<main className="max-width-container">
			<PageHeader title={d.TITLE} description="Manage cleaning requests" />

			<Card className="mb-6 py-1">
				<div className="p-4 flex flex-wrap gap-4">
					<div className="flex-1 min-w-[200px]">
						<Input
							placeholder="Search..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') {
									setPage(1);
									fetchCleanings();
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
				) : filteredCleanings.length === 0 ? (
					<div className="p-12 text-center text-muted-foreground">No cleaning requests found</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full">
							<thead className="bg-muted/50">
								<tr>
									<th className="text-left p-4 font-medium">Date</th>
									<th className="text-left p-4 font-medium">Property</th>
									<th className="text-left p-4 font-medium">Host</th>
									<th className="text-left p-4 font-medium">Cleaner</th>
									<th className="text-left p-4 font-medium">Status</th>
									<th className="text-left p-4 font-medium">Cost</th>
									<th className="text-right p-4 font-medium">Actions</th>
								</tr>
							</thead>
							<tbody>
								{filteredCleanings.map((cleaning) => (
									<tr key={cleaning.id} className="border-t hover:bg-muted/30">
										<td className="p-4">
											<div className="font-medium">
												{new Date(cleaning.scheduled_start).toLocaleDateString()}
											</div>
											<div className="text-sm text-muted-foreground">
												{new Date(cleaning.scheduled_start).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit',
												})}
											</div>
										</td>
										<td className="p-4">
											<div className="font-medium">{cleaning.property_address}</div>
											<div className="text-sm text-muted-foreground">
												{cleaning.property_postcode}
											</div>
										</td>
										<td className="p-4">{cleaning.host_name}</td>
										<td className="p-4">
											{cleaning.cleaner_name || (
												<span className="text-muted-foreground">Unassigned</span>
											)}
										</td>
										<td className="p-4">
											<Badge className={`${getStatusBadge(cleaning.status)} capitalize`}>
												{cleaning.status.replace('_', ' ')}
											</Badge>
										</td>
										<td className="p-4 font-medium">£{cleaning.service_cost}</td>
										<td className="p-4 text-right">
											<Select
												onValueChange={(value) => {
													if (value === 'assign') {
														setSelectedCleaning(cleaning.id);
														setIsAssignModalOpen(true);
													} else if (value === 'unassign') {
														handleUnassignCleaner(cleaning.id);
													} else if (value === 'status') {
														setSelectedStatusCleaning(cleaning.id);
														setNewStatus(cleaning.status);
														setIsStatusModalOpen(true);
													}
												}}
												disabled={
													cleaning.status === 'in_progress' || cleaning.status === 'completed'
												}>
												<SelectTrigger className="w-[110px] ml-auto">
													<SelectValue placeholder="Actions" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="assign">Assign</SelectItem>
													{cleaning.cleaner_id && (
														<SelectItem value="unassign">Unassign</SelectItem>
													)}
													<SelectItem value="status">Change Status</SelectItem>
												</SelectContent>
											</Select>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}

				{totalCount > limit && (
					<div className="flex items-center justify-between p-4 border-t">
						<p className="text-sm text-muted-foreground">
							Showing {filteredCleanings.length} of {totalCount}
						</p>
						<div className="flex gap-2">
							<Button
								variant="outline"
								size="sm"
								disabled={page === 1}
								onClick={() => setPage(page - 1)}>
								Previous
							</Button>
							<Button
								variant="outline"
								size="sm"
								disabled={page * limit >= totalCount}
								onClick={() => setPage(page + 1)}>
								Next
							</Button>
						</div>
					</div>
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
							<Button onClick={handleAssignCleaner} disabled={assigning}>
								{assigning ? <Loader2 className="size-4 animate-spin" /> : 'Assign'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>

			<Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Change Status</DialogTitle>
						<DialogDescription>Select new status</DialogDescription>
					</DialogHeader>
					<div className="space-y-4">
						<Select value={newStatus} onValueChange={setNewStatus}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="draft">Draft</SelectItem>
								<SelectItem value="requested">Requested</SelectItem>
								<SelectItem value="confirmed">Confirmed</SelectItem>
								<SelectItem value="in_progress">In Progress</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
								<SelectItem value="cancelled">Cancelled</SelectItem>
							</SelectContent>
						</Select>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
								Cancel
							</Button>
							<Button onClick={handleUpdateStatus} disabled={updatingStatus}>
								{updatingStatus ? <Loader2 className="size-4 animate-spin" /> : 'Update'}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
