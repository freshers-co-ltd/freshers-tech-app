'use client';

import { ArrowDownUp, ListFilter, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	CLEANING_STATUS,
	type CleaningStatus,
	STATUS_GROUPS,
} from '@/features/cleanings/cleaningService';
import { CleaningCard } from '@/features/cleanings/components/CleaningCard';
import { useCleanerCleanings } from '@/features/cleanings/useCleanerCleanings';

interface CleanerCleaningGridProps {
	onView: (id: string) => void;
}

export function CleanerCleaningGrid({ onView }: CleanerCleaningGridProps) {
	const { cleanings, isLoading } = useCleanerCleanings();
	const [searchQuery, setSearchQuery] = useState('');
	const [statusFilter, setStatusFilter] = useState('all');
	const [sortBy, setSortBy] = useState('date_asc');

	const filteredCleanings = useMemo(() => {
		let result = [...cleanings];

		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(c) =>
					c.property?.address_line_1.toLowerCase().includes(query) ||
					c.property?.postcode.toLowerCase().includes(query),
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
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
				<div className="relative flex-1 sm:max-w-xs">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search address..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="h-8 pl-9 focus-visible:ring-1"
					/>
				</div>

				<div className="flex flex-row items-center gap-3">
					<Select value={statusFilter} onValueChange={setStatusFilter}>
						<SelectTrigger className="h-10 w-full sm:w-40">
							<div className="flex items-center gap-2">
								<ListFilter className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Status" />
							</div>
						</SelectTrigger>
						<SelectContent align="end" emptyMessage="No statuses available">
							<SelectItem value="all">All Statuses</SelectItem>
							{(STATUS_GROUPS.CLEANER_VIEW as CleaningStatus[]).map((status) => {
								const displayLabel = status === CLEANING_STATUS.CONFIRMED ? 'assigned' : status;

								return (
									<SelectItem key={status} value={status}>
										{displayLabel.charAt(0).toUpperCase() + displayLabel.slice(1).replace('_', ' ')}
									</SelectItem>
								);
							})}
						</SelectContent>
					</Select>

					<Select value={sortBy} onValueChange={setSortBy}>
						<SelectTrigger className="h-10 w-full sm:w-48">
							<div className="flex items-center gap-2">
								<ArrowDownUp className="h-4 w-4 text-muted-foreground" />
								<SelectValue placeholder="Sort by" />
							</div>
						</SelectTrigger>
						<SelectContent align="end">
							<SelectItem value="date_asc">Date: Newest first</SelectItem>
							<SelectItem value="date_desc">Date: Oldest first</SelectItem>
						</SelectContent>
					</Select>
				</div>
			</div>

			{filteredCleanings.length === 0 ? (
				<div className="flex h-64 items-center justify-center rounded-xl border border-dashed text-muted-foreground">
					No assigned jobs found.
				</div>
			) : (
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
					{filteredCleanings.map((cleaning) => (
						<CleaningCard
							key={cleaning.id}
							cleaning={cleaning}
							userRole="cleaner"
							onView={onView}
						/>
					))}
				</div>
			)}
		</div>
	);
}
