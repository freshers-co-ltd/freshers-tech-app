'use client';

import { Home, Loader2, Search, UserPlus, UserX } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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

	const openAssignModal = (cleaningId: string) => {
		setSelectedCleaning(cleaningId);
		setSelectedCleaner('');
		setIsAssignModalOpen(true);
	};

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

	const isDisabled = (cleaning: AdminCleaning) =>
		cleaning.status === 'in_progress' || cleaning.status === 'completed';

	return (
		<main className="max-width-container">
			<PageHeader title={d.TITLE} description="Manage cleaning requests" />

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
					<>
						<div className="grid gap-4 md:hidden p-4">
							{cleanings.map((cleaning) => (
								<Card key={cleaning.id} className="p-4">
									<div className="flex items-center gap-3 mb-3">
										<div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
											<Home className="size-5 text-muted-foreground" />
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-medium truncate">{cleaning.property_address}</p>
											<p className="text-sm text-muted-foreground truncate">
												{cleaning.property_postcode}
											</p>
										</div>
									</div>

									<div className="flex flex-col">
										{[
											{
												label: 'Date',
												value: new Date(cleaning.scheduled_start).toLocaleDateString(),
											},
											{
												label: 'Time',
												value: new Date(cleaning.scheduled_start).toLocaleTimeString([], {
													hour: '2-digit',
													minute: '2-digit',
												}),
											},
											{ label: 'Host', value: cleaning.host_name || '-' },
											{
												label: 'Cleaner',
												value: cleaning.cleaner_name || (
													<span className="text-muted-foreground">Unassigned</span>
												),
											},
											{
												label: 'Status',
												value: (
													<Badge
														className={`${getStatusBadge(cleaning.status)} capitalize text-xs`}>
														{cleaning.status.replace('_', ' ')}
													</Badge>
												),
											},
											{ label: 'Cost', value: `£${cleaning.service_cost}` },
										].map((item) => (
											<div
												key={item.label}
												className="grid grid-cols-[1fr_1.5fr] border-b last:border-0 text-sm">
												<div className="py-2 font-medium border-r">{item.label}</div>
												<div className="px-3 py-2 flex items-center justify-center">
													{item.value}
												</div>
											</div>
										))}
									</div>

									<div className="flex gap-2 pt-3 border-t">
										<Tooltip>
											<TooltipTrigger asChild>
												<span>
													<Button
														variant="secondary"
														size="sm"
														className="h-8 w-8 p-0"
														disabled={isDisabled(cleaning)}
														onClick={() => openAssignModal(cleaning.id)}>
														<UserPlus className="size-4" />
													</Button>
												</span>
											</TooltipTrigger>
											<TooltipContent>
												<p>{cleaning.cleaner_id ? 'Reassign Cleaner' : 'Assign Cleaner'}</p>
											</TooltipContent>
										</Tooltip>
										{cleaning.cleaner_id && (
											<Tooltip>
												<TooltipTrigger asChild>
													<span>
														<Button
															variant="secondary"
															size="sm"
															className="h-8 w-8 p-0"
															disabled={isDisabled(cleaning)}
															onClick={() => handleUnassignCleaner(cleaning.id)}>
															<UserX className="size-4" />
														</Button>
													</span>
												</TooltipTrigger>
												<TooltipContent>
													<p>Unassign Cleaner</p>
												</TooltipContent>
											</Tooltip>
										)}
									</div>
								</Card>
							))}
						</div>

						<div className="hidden md:block overflow-x-auto">
							<table className="w-full">
								<thead className="bg-muted/50">
									<tr>
										<th className="text-left p-4 font-medium">Date</th>
										<th className="text-left p-4 font-medium">Property Address</th>
										<th className="text-left p-4 font-medium">Host</th>
										<th className="text-left p-4 font-medium">Cleaner</th>
										<th className="text-left p-4 font-medium">Status</th>
										<th className="text-left p-4 font-medium">Cost</th>
										<th className="text-right p-4 font-medium">Actions</th>
									</tr>
								</thead>
								<tbody>
									{cleanings.map((cleaning) => (
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
												<div className="flex items-center justify-end gap-1">
													<Tooltip>
														<TooltipTrigger asChild>
															<span>
																<Button
																	variant="secondary"
																	size="sm"
																	className="h-8 w-8 p-0"
																	disabled={isDisabled(cleaning)}
																	onClick={() => openAssignModal(cleaning.id)}>
																	<UserPlus className="size-4" />
																</Button>
															</span>
														</TooltipTrigger>
														<TooltipContent>
															<p>{cleaning.cleaner_id ? 'Reassign Cleaner' : 'Assign Cleaner'}</p>
														</TooltipContent>
													</Tooltip>
													{cleaning.cleaner_id && (
														<Tooltip>
															<TooltipTrigger asChild>
																<span>
																	<Button
																		variant="secondary"
																		size="sm"
																		className="h-8 w-8 p-0"
																		disabled={isDisabled(cleaning)}
																		onClick={() => handleUnassignCleaner(cleaning.id)}>
																		<UserX className="size-4" />
																	</Button>
																</span>
															</TooltipTrigger>
															<TooltipContent>
																<p>Unassign Cleaner</p>
															</TooltipContent>
														</Tooltip>
													)}
												</div>
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</>
				)}

				{totalCount > limit && (
					<div className="flex items-center justify-between p-4 border-t">
						<p className="text-sm text-muted-foreground">
							Showing {cleanings.length} of {totalCount}
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
						<DialogTitle>
							{cleanings.find((c) => c.id === selectedCleaning)?.cleaner_id
								? 'Reassign Cleaner'
								: 'Assign Cleaner'}
						</DialogTitle>
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
								{assigning ? (
									<Loader2 className="size-4 animate-spin" />
								) : cleanings.find((c) => c.id === selectedCleaning)?.cleaner_id ? (
									'Reassign'
								) : (
									'Assign'
								)}
							</Button>
						</div>
					</div>
				</DialogContent>
			</Dialog>
		</main>
	);
}
