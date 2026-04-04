'use client';

import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { useCleanings } from '@/features/cleanings/CleaningContext';
import { STATUS } from '@/features/cleanings/cleaningService';
import { CleaningCard } from '@/features/cleanings/components/CleaningCard';

interface CleaningManagementGridProps {
	onView: (id: string) => void;
	onEdit: (id: string) => void;
	onDelete: (id: string) => void;
}

export function CleaningManagementGrid({ onView, onEdit, onDelete }: CleaningManagementGridProps) {
	const { cleanings, isLoading } = useCleanings();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [sortBy, setSortBy] = useState('date_desc');

	const filteredCleanings = useMemo(() => {
		let result = [...cleanings];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(c) =>
					c.properties?.address_line_1.toLowerCase().includes(query) ||
					c.properties?.postcode.toLowerCase().includes(query),
			);
		}

		if (statusFilter !== 'all') {
			result = result.filter((c) => c.status === statusFilter);
		}

		result.sort((a, b) => {
			if (sortBy === 'date_asc') {
				return new Date(a.scheduled_start).getTime() - new Date(b.scheduled_start).getTime();
			}
			if (sortBy === 'date_desc') {
				return new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime();
			}
			if (sortBy === 'requested_desc') {
				return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
			}
			return 0;
		});

		return result;
	}, [cleanings, searchQuery, statusFilter, sortBy]);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col gap-4 md:flex-row md:items-center">
					<div className="h-10 w-full md:w-72 bg-muted animate-pulse rounded-md" />
					<div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
					<div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
				</div>
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{[1, 2, 3].map((i) => (
						<div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
					))}
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center">
				<div className="relative flex-1 md:max-w-72">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search by address..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>

				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full md:w-40">
						<SelectValue placeholder="Status" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Statuses</SelectItem>
						{STATUS.ALL.map((status) => (
							<SelectItem key={status} value={status}>
								{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="w-full md:w-48">
						<SelectValue placeholder="Sort by" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="date_desc">Date: Newest first</SelectItem>
						<SelectItem value="date_asc">Date: Oldest first</SelectItem>
						<SelectItem value="requested_desc">Recently Requested</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{filteredCleanings.length === 0 ? (
				<div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
					No cleaning requests found.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{filteredCleanings.map((cleaning) => (
						<CleaningCard
							key={cleaning.id}
							cleaning={cleaning}
							onView={onView}
							onEdit={onEdit}
							onDelete={onDelete}
						/>
					))}
				</div>
			)}
		</div>
	);
}
